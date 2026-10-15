/**
 * Compila o documento externo de Quesitos — mesmo padrão "modelo
 * intermediário único" dos demais compiladores.
 *
 * Layout novo (15/10/2026) — modelo que ela montou no Canva e mandou como
 * "o material precisa ficar assim". O layout anterior (I-Apresentação com
 * pontos controvertidos, título "QUESITOS DA AUTORA", IV-Requerimento) saía
 * com "a ordem trocada" e foi substituído por inteiro:
 *
 *   [logomarca no topo de toda página]
 *   AO DOUTO JUÍZO ... (negrito)
 *   Processo nº ...
 *   Parágrafo de apresentação do AT (sem título)
 *   I- BREVE CONTEXTUALIZAÇÃO TÉCNICO-PERICIAL   (só se preenchido)
 *   II- QUESITOS TÉCNICO-PERICIAIS               (frase opcional, grupos A/B, subitens a/b/c)
 *   Parágrafo de fechamento (sem título)
 *   Local, data (à direita) · assinatura · nome · título | CRM
 *   [contato em cinza no rodapé]
 *
 * Vai AO JUÍZO: usa `CabecalhoFormal` (endereçamento) com `estilo:
 * "peticao_at"` (ver modelo.ts). Endereçamento é texto livre — a AT nem
 * sempre tem vara/comarca estruturada no cadastro.
 */

import { createClient } from "@/lib/supabase/server";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import type { SnapshotQuesitosParte } from "@/types/json-fields";
import { apresentacaoPadrao, trechoParte } from "./catalogos";
import type { QuesitosRow } from "@/types/database";

export type ResultadoQuesitosDocumento =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotQuesitosParte }
  | { status: "erro"; mensagem: string };

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

/** Texto multilinha → um parágrafo por bloco separado por linha em branco (quebras simples ficam dentro do parágrafo). */
function paragrafos(texto: string | null): BlocoConteudo[] {
  if (!texto?.trim()) return [];
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(paragrafo);
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatarDataExtenso(dataIso: string): string {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${parseInt(dia, 10)} de ${MESES_EXTENSO[parseInt(mes, 10) - 1]} de ${ano}`;
}

/** "Fortaleza - CE" → "Fortaleza-CE" (formato do modelo dela). */
function localCompacto(local: string): string {
  return local.replace(/\s*-\s*/g, "-");
}

export async function compilarQuesitosDocumento(processoId: string, documentoId: string): Promise<ResultadoQuesitosDocumento> {
  const supabase = await createClient();

  const [
    { data: processo, error: erroProcesso },
    { data: documento, error: erroDocumento },
    { data: config, error: erroConfig },
    { data: quesitosDb, error: erroQuesitos },
  ] = await Promise.all([
    supabase.from("processos").select("*").eq("id", processoId).single(),
    supabase.from("quesitos_documentos").select("*").eq("id", documentoId).single(),
    supabase.from("configuracoes").select("*").maybeSingle(),
    supabase
      .from("quesitos")
      .select("*")
      .eq("processo_id", processoId)
      .eq("apresentar", true)
      .order("ordem", { ascending: true }),
  ]);
  if (erroProcesso) return { status: "erro", mensagem: erroProcesso.message };
  if (erroDocumento) return { status: "erro", mensagem: erroDocumento.message };
  if (erroConfig) return { status: "erro", mensagem: erroConfig.message };
  if (erroQuesitos) return { status: "erro", mensagem: erroQuesitos.message };

  const quesitos: QuesitosRow[] = quesitosDb ?? [];
  if (quesitos.length === 0) {
    return { status: "erro", mensagem: "Nenhum quesito marcado para apresentar — marque ao menos um quesito antes de gerar." };
  }

  const linhasEndereco = (documento.endereco_juizo ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  const cabecalho: CabecalhoFormal = {
    tipo: "judicial",
    tituloDocumento: "",
    linhasEndereco: linhasEndereco.length > 0 ? linhasEndereco : ["[ENDEREÇAMENTO AO JUÍZO NÃO PREENCHIDO]"],
    processoNumero: processo.numero_processo,
    parteAutora: null,
    partesRe: null,
    paragrafoIntroducao: documento.apresentacao_at?.trim() || apresentacaoPadrao(documento.parte_selecionada),
  };

  const secoes: SecaoCompilada[] = [];
  let numeroSecao = 0;
  const romano = ["I", "II", "III", "IV"];

  // I — contextualização: só entra se preenchida. Registros antigos que
  // ainda não têm `resumo_fatos` caem nos dois campos antigos.
  const blocosContexto = paragrafos(
    documento.resumo_fatos ??
      ([documento.sintese_tese, documento.o_que_demonstrar_pericia].filter((t) => t?.trim()).join("\n\n") || null),
  );
  if (blocosContexto.length > 0) {
    secoes.push({
      secaoId: "quesitos-doc-contexto",
      codigo: "contextualizacao",
      titulo: `${romano[numeroSecao++]}- BREVE CONTEXTUALIZAÇÃO TÉCNICO-PERICIAL`,
      ordem: numeroSecao,
      blocos: blocosContexto,
    });
  }

  secoes.push({
    secaoId: "quesitos-doc-quesitos",
    codigo: "quesitos_tecnicos",
    titulo: `${romano[numeroSecao++]}- QUESITOS TÉCNICO-PERICIAIS`,
    ordem: numeroSecao,
    blocos: [
      ...paragrafos(documento.introducao_quesitos),
      {
        tipo: "quesitos",
        semResposta: true,
        itens: quesitos.map((q, i) => ({
          numero: i + 1,
          origem: null,
          pergunta: q.pergunta.replace(/\r\n/g, "\n").trim(),
          resposta: null,
          grupo: q.grupo,
        })),
      },
      paragrafo("Diante do exposto, apresentam-se os quesitos acima, requerendo-se que sejam submetidos à apreciação do(a) Sr.(a) Perito(a) Judicial."),
      {
        tipo: "assinatura",
        cidadeData: `${localCompacto(documento.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura)}, ${formatarDataExtenso(documento.data_emissao ?? hojeIso())}`,
        nome: "Dra. Fernanda Nascimento Resende",
        tituloCrm: `Médica Perita – Assistente Técnica ${trechoParte(documento.parte_selecionada).toLowerCase()} | CRM-CE nº ${VALORES_PADRAO_PERITO.crm_uf}`,
      },
    ],
  });

  const modelo: ModeloLaudo = {
    processoId,
    estilo: "peticao_at",
    tipoTrabalho: processo.tipo_trabalho,
    // Petição de AT: sempre o contato de Assistência Técnica, mesmo que o
    // processo esteja cadastrado como judicial.
    rodapeTexto: rodapeTexto(config ?? null, "assistencia_tecnica"),
    tipoLaudoCodigo: "",
    tipoLaudoNome: "",
    geradoEm: new Date().toISOString(),
    cabecalho,
    apresentacao: "",
    secoes,
    imagensPericia: [],
  };

  const snapshot: SnapshotQuesitosParte = {
    tipo: "quesitos_parte",
    gerado_em: modelo.geradoEm,
    dados: { documento, quesitos },
  };

  return { status: "ok", modelo, snapshot };
}
