import { createClient } from "@/lib/supabase/server";
import { avaliarCondicao } from "@/features/preenchimento/condicoes";
import { montarCabecalhoFormal } from "./cabecalho";
import { montarApresentacao } from "./apresentacao";
import {
  construirContexto,
  gerarNarrativoSecao,
  resolverPlaceholders,
  type ContextoNarrativo,
  type RespostaCampoParaNarrativo,
} from "@/features/preenchimento/narrativo";
import type {
  CamposSecaoRow,
  DocumentosRow,
  RespostasProcessoRow,
  RespostasSecaoRow,
  SecoesRow,
} from "@/types/database";
import type { SnapshotRespostas, ValorSelecionado, ValorTabelaLinha } from "@/types/json-fields";
import type {
  BlocoConteudo,
  BlocoTabela,
  PendenciaSecao,
  QuesitoCompilado,
  ResultadoCompilacao,
  SecaoCompilada,
} from "./modelo";

/** codigo usado nos 3 tipos de laudo mapeados (Curatela/Previdenciário/Trabalhista) pra seção estrutural de quesitos — mesma convenção em todos. */
const CODIGO_SECAO_QUESITOS = "respostas_quesitos";

/** codigo da seção de encerramento — mesma convenção nos 4 tipos já mapeados (Curatela/Previdenciário/Trabalhista/Erro Médico). */
const CODIGO_SECAO_ENCERRAMENTO = "encerramento";

/**
 * Compila o conteúdo do laudo de um processo: busca tudo no banco e monta o
 * modelo intermediário (ver modelo.ts). Não decide nada sozinho — reaproveita
 * exatamente a mesma lógica de geração de narrativo/resolução de placeholder
 * já validada no motor de preenchimento (src/features/preenchimento/narrativo.ts),
 * pra não correr o risco de a prévia do preenchimento e o laudo final
 * "lerem" a mesma resposta de dois jeitos diferentes.
 *
 * Seção com conteúdo mas sem `respostas_secao` salva bloqueia a geração
 * (status "pendente_revisao") em vez de compor o texto sozinha — mesmo que o
 * texto recomposto seja idêntico ao que apareceria na tela, a perita nunca
 * chegou a VER esse texto especificamente (CLAUDE.md: "texto sempre
 * editável... revisa antes de finalizar" pressupõe revisão de fato, não só
 * disponibilidade técnica do texto). Só devia disparar em caso de borda —
 * `salvarSecao` já grava campos + narrativo juntos, então no uso normal
 * (preencher e navegar/salvar) toda seção com resposta já ganha essa linha
 * como efeito colateral.
 */
export async function compilarLaudo(processoId: string): Promise<ResultadoCompilacao> {
  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };
  if (!processo.tipo_laudo_id) {
    return { status: "erro", mensagem: "Este processo ainda não tem um tipo de laudo definido." };
  }

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);

  const cabecalho = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalho) {
    return { status: "erro", mensagem: cabecalho.erro };
  }

  const [{ data: tipoLaudo }, { data: secoes }] = await Promise.all([
    supabase.from("tipos_laudo").select("*").eq("id", processo.tipo_laudo_id).single(),
    supabase.from("secoes").select("*").eq("tipo_laudo_id", processo.tipo_laudo_id).order("ordem"),
  ]);
  if (!secoes || secoes.length === 0) {
    return { status: "erro", mensagem: "O tipo de laudo deste processo não tem seções cadastradas." };
  }

  const secaoIds = secoes.map((s) => s.id);
  const [
    { data: campos },
    { data: respostasProcesso },
    { data: respostasSecao },
    { data: quesitosDb },
    { data: documentosDb },
  ] = await Promise.all([
    supabase.from("campos_secao").select("*").in("secao_id", secaoIds).order("ordem"),
    supabase.from("respostas_processo").select("*").eq("processo_id", processoId),
    supabase.from("respostas_secao").select("*").eq("processo_id", processoId),
    supabase.from("quesitos").select("*").eq("processo_id", processoId).order("ordem"),
    supabase.from("documentos").select("*").eq("processo_id", processoId).order("ordem"),
  ]);

  const todosCampos = campos ?? [];
  const todasRespostasProcesso = respostasProcesso ?? [];
  const documentos = documentosDb ?? [];

  const respostaPorCampoId = new Map(todasRespostasProcesso.map((r) => [r.campo_id, r]));
  const respostaSecaoPorSecaoId = new Map((respostasSecao ?? []).map((r) => [r.secao_id, r]));
  const camposPorSecaoId = new Map<string, CamposSecaoRow[]>();
  for (const campo of todosCampos) {
    const lista = camposPorSecaoId.get(campo.secao_id) ?? [];
    lista.push(campo);
    camposPorSecaoId.set(campo.secao_id, lista);
  }

  // Visibilidade das seções: mesma regra do preenchimento (secoes.condicao
  // contra as respostas já salvas) — uma seção condicional não aplicável ao
  // caso não pode aparecer no documento final.
  const valoresPorCodigoGlobal = new Map<string, ValorSelecionado | null>();
  for (const campo of todosCampos) {
    valoresPorCodigoGlobal.set(campo.codigo, respostaPorCampoId.get(campo.id)?.valor_selecionado ?? null);
  }
  const secoesVisiveis = secoes.filter((s) => avaliarCondicao(s.condicao, valoresPorCodigoGlobal));

  // Contexto de placeholders (igual ao preenchimento), estendido com tokens
  // computados a partir de `documentos` — só fazem sentido no documento final
  // compilado (não na tela de preenchimento ao vivo, onde ficaram deliberadamente
  // sem resolver, ver README de preenchimento).
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
  adicionarTokensComputados(contexto, documentos);
  const apresentacao = montarApresentacao(contexto);

  const quesitos: QuesitoCompilado[] = (quesitosDb ?? []).map((q, i) => ({
    numero: i + 1,
    origem: q.origem,
    pergunta: q.pergunta,
    resposta: q.resposta,
  }));

  const { secoesCompiladas, secoesPendentes } = montarSecoesEPendencias(
    secoesVisiveis,
    camposPorSecaoId,
    respostaPorCampoId,
    respostaSecaoPorSecaoId,
    contexto,
    documentos,
    quesitos
  );

  if (secoesPendentes.length > 0) {
    return { status: "pendente_revisao", secoesPendentes };
  }

  const imagensPericia = documentos
    .filter((d) => d.tipo === "imagem_pericia")
    .map((d) => ({ documentoId: d.id, nomeArquivo: d.nome_arquivo, storagePath: d.storage_path }));

  const geradoEm = new Date().toISOString();

  // snapshot_respostas (laudos_gerados) — congela as respostas CRUAS por
  // trás de cada seção que entrou no documento (não o texto já composto, que
  // fica no PDF/Word gerados). Mesmo escopo de secoesCompiladas — se uma
  // seção não entrou no documento, também não entra aqui.
  const snapshot: SnapshotRespostas = {
    gerado_em: geradoEm,
    tipo_laudo_codigo: tipoLaudo?.codigo ?? "",
    secoes: secoesCompiladas.map((sc) => ({
      secao_id: sc.secaoId,
      codigo: sc.codigo,
      titulo: sc.titulo,
      ordem: sc.ordem,
      respostas: (camposPorSecaoId.get(sc.secaoId) ?? []).map((campo) => {
        const r = respostaPorCampoId.get(campo.id);
        return {
          campo_id: campo.id,
          campo_codigo: campo.codigo,
          rotulo: campo.rotulo,
          valor_selecionado: r?.valor_selecionado ?? null,
          texto_livre: r?.texto_livre ?? null,
          texto_narrativo: r?.texto_narrativo ?? null,
        };
      }),
    })),
    quesitos,
  };

  return {
    status: "ok",
    modelo: {
      processoId,
      tipoLaudoCodigo: tipoLaudo?.codigo ?? "",
      tipoLaudoNome: tipoLaudo?.nome ?? "",
      geradoEm,
      cabecalho,
      apresentacao,
      secoes: secoesCompiladas,
      imagensPericia,
    },
    snapshot,
  };
}

/**
 * Percorre as seções visíveis e separa em "compiladas" (têm conteúdo E foram
 * salvas explicitamente — ganham linha em respostas_secao) e "pendentes" (têm
 * conteúdo mas nunca foram salvas — bloqueiam a geração, ver nota no topo do
 * arquivo). Extraída à parte de `compilarLaudo` pra dar pra testar essa regra
 * isoladamente, sem precisar de conexão com o Supabase (só dados já buscados).
 */
export function montarSecoesEPendencias(
  secoesVisiveis: SecoesRow[],
  camposPorSecaoId: Map<string, CamposSecaoRow[]>,
  respostaPorCampoId: Map<string, RespostasProcessoRow>,
  respostaSecaoPorSecaoId: Map<string, RespostasSecaoRow>,
  contexto: ContextoNarrativo,
  documentos: DocumentosRow[],
  quesitos: QuesitoCompilado[]
): { secoesCompiladas: SecaoCompilada[]; secoesPendentes: PendenciaSecao[] } {
  const secoesCompiladas: SecaoCompilada[] = [];
  const secoesPendentes: PendenciaSecao[] = [];

  for (const secao of secoesVisiveis) {
    const camposDaSecao = camposPorSecaoId.get(secao.id) ?? [];
    const respostaSecao = respostaSecaoPorSecaoId.get(secao.id);
    const blocos = compilarBlocosDaSecao(secao, camposDaSecao, respostaPorCampoId, respostaSecao, contexto, documentos, quesitos);
    if (blocos.length === 0) continue; // "se houver resposta" — seção sem nada não entra no documento final

    // Quesitos são revisados na própria tela de Quesitos (cada um salvo
    // individualmente ali) — não são um texto narrativo automático que
    // dependa de "Salvar seção" pra ter sido visto. Cobrar respostas_secao
    // aqui bloquearia a geração por um motivo que não reflete risco real.
    const dispensaRevisaoDeSecao = secao.codigo === CODIGO_SECAO_QUESITOS;

    if (!respostaSecao && !dispensaRevisaoDeSecao) {
      secoesPendentes.push({ secaoId: secao.id, titulo: secao.titulo });
      continue;
    }

    secoesCompiladas.push({
      secaoId: secao.id,
      codigo: secao.codigo,
      titulo: secao.titulo,
      ordem: secao.ordem,
      blocos,
    });
  }

  return { secoesCompiladas, secoesPendentes };
}

/**
 * {{total_documentos}}, {{total_paginas}}, {{categorias_principais}} — tokens
 * computados a partir de `documentos` (tipo = 'documento_processual'). Não
 * amarrado a nenhuma seção específica por código: QUALQUER
 * texto_automatico_template (de qualquer tipo_laudo) que referencie esses
 * nomes passa a resolver sozinho.
 */
function adicionarTokensComputados(contexto: ContextoNarrativo, documentos: DocumentosRow[]) {
  const docsProcessuais = documentos.filter((d) => d.tipo === "documento_processual");
  const totalPaginas = docsProcessuais.reduce((soma, d) => soma + (d.paginas ?? 0), 0);
  const categorias = Array.from(
    new Set(docsProcessuais.map((d) => d.categoria).filter((c): c is string => Boolean(c)))
  );
  contexto.set("total_documentos", { rotulo: "Total de documentos", valorExibivel: String(docsProcessuais.length) });
  contexto.set("total_paginas", { rotulo: "Total de páginas", valorExibivel: String(totalPaginas) });
  contexto.set("categorias_principais", {
    rotulo: "Categorias principais",
    valorExibivel: categorias.length > 0 ? categorias.join(", ") : "documentos diversos",
  });
}

function compilarBlocosDaSecao(
  secao: SecoesRow,
  camposDaSecao: CamposSecaoRow[],
  respostaPorCampoId: Map<string, RespostasProcessoRow>,
  respostaSecao: RespostasSecaoRow | undefined,
  contexto: ContextoNarrativo,
  documentos: DocumentosRow[],
  quesitos: QuesitoCompilado[]
): BlocoConteudo[] {
  const blocos: BlocoConteudo[] = [];

  // Parágrafo narrativo: prioriza o texto já revisado/salvo pela perita
  // (respostas_secao.texto_narrativo — o que ela efetivamente aprovou); sem
  // isso, recompõe automaticamente com a MESMA função usada ao vivo no
  // preenchimento (gerarNarrativoSecao), a partir do que foi marcado.
  const respostasParaNarrativa = new Map<string, RespostaCampoParaNarrativo>(
    camposDaSecao.map((c) => {
      const r = respostaPorCampoId.get(c.id);
      return [
        c.id,
        {
          valor_selecionado: r?.valor_selecionado ?? null,
          texto_livre: r?.texto_livre ?? null,
          confirmado_pelo_perito: r?.confirmado_pelo_perito ?? false,
        },
      ];
    })
  );
  const textoSalvo = respostaSecao?.texto_narrativo?.trim();
  const textoNarrativo = textoSalvo || gerarNarrativoSecao(secao, camposDaSecao, respostasParaNarrativa, contexto);
  if (textoNarrativo) {
    blocos.push({ tipo: "paragrafo", texto: textoNarrativo });
  }

  // Tabelas preenchidas (tipo_campo = 'tabela') nunca entram no parágrafo
  // narrativo (valorExibivelCampo as ignora de propósito) — viram bloco próprio.
  for (const campo of camposDaSecao) {
    if (campo.tipo_campo !== "tabela") continue;
    const tabela = compilarTabela(campo, respostaPorCampoId.get(campo.id)?.valor_selecionado ?? null);
    if (tabela) blocos.push(tabela);
  }

  // Matriz de Documentos Analisados: identificada pelo próprio template
  // referenciar {{total_documentos}} (não por um código de seção fixo — vale
  // pra qualquer tipo_laudo que use essa convenção, presente e futuro).
  if (secao.texto_automatico_template?.includes("{{total_documentos}}")) {
    const tabelaDocs = compilarTabelaDocumentos(documentos);
    if (tabelaDocs) blocos.push(tabelaDocs);
  }

  // Respostas aos Quesitos: seção estrutural (0 campos_secao) — o conteúdo
  // vem direto da tabela `quesitos`, não de campos_secao/respostas_processo.
  if (secao.codigo === CODIGO_SECAO_QUESITOS && quesitos.length > 0) {
    blocos.push({ tipo: "quesitos", itens: quesitos });
  }

  // Fechamento/assinatura: cidade/data + nome + título têm alinhamento
  // próprio no documento final (ver BlocoAssinatura) — não entram no
  // parágrafo de ressalva jurídica acima. "Dra."/"Médica Perita Judicial"
  // fixos (só existe uma perita usando o sistema, ver CLAUDE.md); nome e CRM
  // vêm de {{nome_perito}}/{{crm_uf}} (Seção I, com valor padrão pré-preenchido
  // — ver perito-padrao.ts), com o mesmo fallback "[a preencher]" de sempre
  // se por algum motivo ainda não tiverem resposta.
  if (secao.codigo === CODIGO_SECAO_ENCERRAMENTO) {
    blocos.push({
      tipo: "assinatura",
      cidadeData: resolverPlaceholders("{{cidade_uf_assinatura}}, {{data_assinatura}}.", contexto),
      nome: resolverPlaceholders("Dra. {{nome_perito}}", contexto),
      tituloCrm: resolverPlaceholders("Médica Perita Judicial, CRM {{crm_uf}}.", contexto),
    });
  }

  return blocos;
}

function compilarTabela(campo: CamposSecaoRow, valor: ValorSelecionado | null): BlocoTabela | null {
  const config = campo.config_tabela;
  if (!config || !Array.isArray(valor) || valor.length === 0) return null;
  const linhasValor = valor as ValorTabelaLinha[];

  // Formato original (valor por linha em ValorTabelaLinhaSimples): linhas fixas
  // x 1 coluna FECHADA — ex.: Curatela, escala 0-3/NA. Mesma regra da tela de
  // preenchimento (tabela-campo.tsx): 1 coluna de texto cai no formato
  // multi-coluna abaixo (valores por célula).
  const coluna0 = config.colunas[0];
  const umaColunaSelecao =
    config.colunas.length === 1 &&
    !config.linhas_dinamicas &&
    (coluna0.tipo === "selecao_unica" || (!coluna0.tipo && Boolean(coluna0.opcoes?.length)));
  if (umaColunaSelecao) {
    const coluna = config.colunas[0];
    const linhas: string[][] = [];
    for (const linhaConfig of config.linhas) {
      const entrada = linhasValor.find((l) => l.linha === linhaConfig.codigo);
      if (!entrada || !("valor" in entrada) || !entrada.valor) continue;
      const rotuloValor = coluna.opcoes?.find((o) => o.codigo === entrada.valor)?.rotulo ?? entrada.valor;
      linhas.push([linhaConfig.rotulo, rotuloValor]);
    }
    if (linhas.length === 0) return null;
    return { tipo: "tabela", colunas: ["Item", coluna.rotulo ?? "Valor"], linhas };
  }

  // Multi-coluna, fixa ou dinâmica (ver src/features/preenchimento/tabela-campo.tsx).
  const linhaFixa = !config.linhas_dinamicas;
  const cabecalho = linhaFixa
    ? ["Item", ...config.colunas.map((c) => c.rotulo ?? c.codigo)]
    : config.colunas.map((c) => c.rotulo ?? c.codigo);

  const linhasParaIterar = linhaFixa
    ? config.linhas.map((l) => ({ id: l.codigo, rotuloItem: l.rotulo as string | null }))
    : linhasValor.map((l) => ({ id: l.linha, rotuloItem: null as string | null }));

  const linhas: string[][] = [];
  for (const { id, rotuloItem } of linhasParaIterar) {
    const entrada = linhasValor.find((l) => l.linha === id);
    const valoresCelula = entrada && "valores" in entrada ? entrada.valores : {};
    const temAlgumValor = config.colunas.some((c) => valoresCelula[c.codigo]?.trim());
    if (!temAlgumValor) continue;
    const linha = config.colunas.map((c) => {
      const bruto = valoresCelula[c.codigo] ?? "";
      return c.opcoes?.find((o) => o.codigo === bruto)?.rotulo ?? bruto;
    });
    linhas.push(rotuloItem ? [rotuloItem, ...linha] : linha);
  }

  if (linhas.length === 0) return null;
  return { tipo: "tabela", colunas: cabecalho, linhas };
}

function compilarTabelaDocumentos(documentos: DocumentosRow[]): BlocoTabela | null {
  const docs = documentos.filter((d) => d.tipo === "documento_processual");
  if (docs.length === 0) return null;
  const linhas = docs.map((d) => [
    d.nome_arquivo,
    d.categoria ?? "—",
    d.origem_profissional ?? "—",
    d.data_documento ?? "—",
    d.paginas ? String(d.paginas) : "—",
  ]);
  return { tipo: "tabela", colunas: ["Documento", "Categoria", "Origem", "Data", "Páginas"], linhas };
}
