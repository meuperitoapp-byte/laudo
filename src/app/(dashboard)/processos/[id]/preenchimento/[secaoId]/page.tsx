import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avaliarCondicao } from "@/features/preenchimento/condicoes";
import { construirArvoreCampos } from "@/features/preenchimento/campo-tree";
import {
  construirContexto,
  valorExibivelCampo,
  type ContextoCampo,
  type RespostaCampoParaNarrativo,
} from "@/features/preenchimento/narrativo";
import { SecaoWorkspace } from "@/features/preenchimento/secao-workspace";
import { ESTADO_VAZIO, type EstadoRespostas, type SecaoNavItem } from "@/features/preenchimento/tipos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type {
  AchadoParaVinculo,
  DocumentoParaVinculo,
  RespostaPersistida,
} from "@/features/preenchimento/rastreabilidade-tipos";
import type { ValorSelecionado } from "@/types/json-fields";

export default async function PreenchimentoSecaoPage({
  params,
}: {
  params: Promise<{ id: string; secaoId: string }>;
}) {
  const { id: processoId, secaoId } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("id, tipo_laudo_id, periciando_nome")
    .eq("id", processoId)
    .single();

  if (!processo) {
    notFound();
  }

  if (!processo.tipo_laudo_id) {
    return (
      <main className="p-8 max-w-xl space-y-4">
        <Link
          href={`/processos/${processoId}`}
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar para o processo
        </Link>
        <p className="text-sm text-nevoa-700 dark:text-nevoa-300">
          Este processo ainda não tem um tipo de laudo definido. Defina a natureza do processo no
          cadastro antes de preencher o laudo por seção.
        </p>
      </main>
    );
  }

  const [{ data: tipoLaudo }, { data: secoes }, { data: reutilizaveisData }] = await Promise.all([
    supabase.from("tipos_laudo").select("nome").eq("id", processo.tipo_laudo_id).single(),
    supabase
      .from("secoes")
      .select("*")
      .eq("tipo_laudo_id", processo.tipo_laudo_id)
      .order("ordem"),
    // Respostas reutilizáveis relevantes pra este tipo_laudo: presas a um
    // campo dele (campo_id setado, sempre junto com este tipo_laudo_id — ver
    // src/features/respostas-reutilizaveis/actions.ts) ou genéricas
    // (tipo_laudo_id null). O filtro por campo específico é feito no client
    // (campo-field.tsx), aqui só reduz o que trafega pra cá.
    supabase
      .from("respostas_reutilizaveis")
      .select("*")
      .or(`tipo_laudo_id.eq.${processo.tipo_laudo_id},tipo_laudo_id.is.null`),
  ]);

  if (!secoes || secoes.length === 0) {
    notFound();
  }

  const secaoIds = secoes.map((s) => s.id);

  const [{ data: campos }, { data: respostasProcesso }, { data: respostasSecao }] = await Promise.all([
    supabase.from("campos_secao").select("*").in("secao_id", secaoIds).order("ordem"),
    supabase.from("respostas_processo").select("*").eq("processo_id", processoId),
    supabase.from("respostas_secao").select("*").eq("processo_id", processoId),
  ]);

  const todosCampos = campos ?? [];
  const todasRespostasProcesso = respostasProcesso ?? [];
  const todasRespostasSecao = respostasSecao ?? [];

  const respostaPorCampoId = new Map(todasRespostasProcesso.map((r) => [r.campo_id, r]));
  const respostaSecaoPorSecaoId = new Map(todasRespostasSecao.map((r) => [r.secao_id, r]));

  // Rastreabilidade (CLAUDE.md > "Regra: rastreabilidade"): documentos do
  // processo + vínculos já criados, pra oferecer como evidência de uma
  // conclusão. resposta_evidencias não tem processo_id direto — filtra pelos
  // ids de respostas_processo deste processo.
  const respostaProcessoIds = todasRespostasProcesso.map((r) => r.id);
  const { data: documentosDoProcesso } = await supabase
    .from("documentos")
    .select("id, nome_arquivo, tipo, categoria")
    .eq("processo_id", processoId)
    .order("ordem");
  const { data: evidenciasData } =
    respostaProcessoIds.length > 0
      ? await supabase.from("resposta_evidencias").select("*").in("resposta_id", respostaProcessoIds)
      : { data: [] };

  // Visibilidade das seções: avalia secoes.condicao contra as respostas já
  // salvas do processo inteiro (CLAUDE.md, "Regra: campos condicionais").
  const valoresPorCodigoGlobal = new Map<string, ValorSelecionado | null>();
  for (const campo of todosCampos) {
    valoresPorCodigoGlobal.set(campo.codigo, respostaPorCampoId.get(campo.id)?.valor_selecionado ?? null);
  }
  const secoesVisiveis = secoes.filter((s) => avaliarCondicao(s.condicao, valoresPorCodigoGlobal));

  if (secoesVisiveis.length === 0) {
    notFound();
  }

  const secaoAtual = secoesVisiveis.find((s) => s.id === secaoId);
  if (!secaoAtual) {
    // Seção inexistente, ou condicional e não aplicável ao caso — manda pra primeira seção visível.
    redirect(`/processos/${processoId}/preenchimento/${secoesVisiveis[0].id}`);
  }

  const camposPorSecaoId = new Map<string, typeof todosCampos>();
  for (const campo of todosCampos) {
    const lista = camposPorSecaoId.get(campo.secao_id) ?? [];
    lista.push(campo);
    camposPorSecaoId.set(campo.secao_id, lista);
  }

  const secoesNav: SecaoNavItem[] = secoesVisiveis.map((s) => {
    const camposDaSecao = camposPorSecaoId.get(s.id) ?? [];
    const respondida =
      camposDaSecao.some((c) => {
        const r = respostaPorCampoId.get(c.id);
        return Boolean(r && (r.valor_selecionado !== null || (r.texto_livre && r.texto_livre.trim())));
      }) || Boolean(respostaSecaoPorSecaoId.get(s.id)?.texto_narrativo?.trim());
    return {
      id: s.id,
      titulo: s.titulo,
      ordem: s.ordem,
      respondida,
      estrutural: camposDaSecao.length === 0,
    };
  });

  // Contexto de resolução de placeholders (secoes/campos texto_automatico_template)
  // a partir de TODO o tipo_laudo — templates podem referenciar campos de
  // qualquer seção, não só a atual.
  const respostaParaNarrativaPorCampoId = new Map<string, RespostaCampoParaNarrativo>(
    todosCampos.map((campo) => {
      const r = respostaPorCampoId.get(campo.id);
      return [
        campo.id,
        {
          valor_selecionado: r?.valor_selecionado ?? null,
          texto_livre: r?.texto_livre ?? null,
          confirmado_pelo_perito: r?.confirmado_pelo_perito ?? false,
        },
      ];
    })
  );
  const contexto = construirContexto(todosCampos, respostaParaNarrativaPorCampoId);
  const contextoBase: Record<string, ContextoCampo> = Object.fromEntries(contexto);

  // Rastreabilidade, cont.: "achados" candidatos a evidência são qualquer
  // resposta já respondida em QUALQUER seção do processo (CLAUDE.md: "vincular
  // aos elementos documentais, clínicos e ocupacionais que a sustentam" — não
  // se restringe à seção atual). Reaproveita valorExibivelCampo (mesma função
  // usada pra gerar o texto narrativo) só pra montar um resumo legível.
  const secaoPorId = new Map(secoes.map((s) => [s.id, s]));
  const campoPorId = new Map(todosCampos.map((c) => [c.id, c]));
  const achadosDisponiveis: AchadoParaVinculo[] = todasRespostasProcesso
    .filter((r) => r.valor_selecionado !== null || (r.texto_livre && r.texto_livre.trim()))
    .flatMap((r) => {
      const campo = campoPorId.get(r.campo_id);
      if (!campo) return [];
      const secao = secaoPorId.get(campo.secao_id);
      const resumo = valorExibivelCampo(campo, r.valor_selecionado, r.texto_livre) ?? r.texto_livre?.trim() ?? "(ver seção)";
      return [{ respostaId: r.id, rotulo: campo.rotulo, secaoTitulo: secao?.titulo ?? "", resumo }];
    });

  const documentosDisponiveis: DocumentoParaVinculo[] = (documentosDoProcesso ?? []).map((d) => ({
    id: d.id,
    nomeArquivo: d.nome_arquivo,
    tipo: d.tipo,
    categoria: d.categoria,
  }));

  const respostasPersistidas: Record<string, RespostaPersistida> = {};
  for (const [campoId, r] of respostaPorCampoId) {
    respostasPersistidas[campoId] = {
      id: r.id,
      valorSelecionado: r.valor_selecionado,
      textoLivre: r.texto_livre,
      confirmadoPeloPerito: r.confirmado_pelo_perito,
    };
  }

  const camposDaSecaoAtual = camposPorSecaoId.get(secaoAtual.id) ?? [];
  const arvoreCampos = construirArvoreCampos(camposDaSecaoAtual);

  // Pré-preenche campos de identificação da perita (nome/CRM/cidade) quando
  // ainda não há resposta salva — ver perito-padrao.ts. Continua editável;
  // só evita ela digitar os mesmos dados fixos em todo processo novo.
  const respostasIniciais: EstadoRespostas = {};
  for (const campo of camposDaSecaoAtual) {
    const r = respostaPorCampoId.get(campo.id);
    if (r) {
      respostasIniciais[campo.id] = {
        valorSelecionado: r.valor_selecionado,
        textoLivre: r.texto_livre,
        confirmadoPeloPerito: r.confirmado_pelo_perito,
      };
      continue;
    }
    const valorPadrao = VALORES_PADRAO_PERITO[campo.codigo];
    respostasIniciais[campo.id] =
      campo.tipo_campo === "texto_livre" && valorPadrao
        ? { ...ESTADO_VAZIO, textoLivre: valorPadrao }
        : ESTADO_VAZIO;
  }

  const respostaSecaoAtual = respostaSecaoPorSecaoId.get(secaoAtual.id);

  return (
    <SecaoWorkspace
      // Remonta o workspace a cada seção: a navegação entre seções é "soft"
      // (router.push), então sem key o React reaproveita a mesma instância e os
      // useState (respostas, snapshot do salvo) não reinicializam — só a 1ª
      // seção ficava editável.
      key={secaoAtual.id}
      processoId={processoId}
      tipoLaudoNome={tipoLaudo?.nome ?? ""}
      periciandoNome={processo.periciando_nome}
      secoesNav={secoesNav}
      secaoAtualId={secaoAtual.id}
      secaoAtualTitulo={secaoAtual.titulo}
      secaoTextoAutomaticoTemplate={secaoAtual.texto_automatico_template}
      arvoreCampos={arvoreCampos}
      respostasIniciais={respostasIniciais}
      narrativoSecaoInicial={
        respostaSecaoAtual
          ? { texto: respostaSecaoAtual.texto_narrativo, editadoManualmente: respostaSecaoAtual.editado_manualmente }
          : null
      }
      contextoBase={contextoBase}
      estrutural={camposDaSecaoAtual.length === 0}
      tipoLaudoId={processo.tipo_laudo_id}
      reutilizaveis={reutilizaveisData ?? []}
      respostasPersistidas={respostasPersistidas}
      achadosDisponiveis={achadosDisponiveis}
      documentosDisponiveis={documentosDisponiveis}
      evidencias={evidenciasData ?? []}
    />
  );
}
