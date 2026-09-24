/**
 * Compila o documento externo de Quesitos — mesmo padrão "modelo
 * intermediário único" dos demais compiladores. Baseado em
 * PERICONS_MODELO_ENXUTO_APRESENTACAO_QUESITOS.pdf.
 *
 * Diferente dos outros documentos do lote (Réplica, Relatório Técnico,
 * Estratégia Pericial — todos entregues ao advogado), este vai AO JUÍZO: usa
 * `CabecalhoFormal` (endereçamento), não `CabecalhoAssistenciaTecnica`. Como
 * a Assistência Técnica não tem vara/comarca estruturada, o endereçamento é
 * texto livre digitado pela perita (quesitos_documentos.endereco_juizo).
 */

import { createClient } from "@/lib/supabase/server";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import type { SnapshotQuesitosParte } from "@/types/json-fields";
import { PARTE_ROTULOS } from "./catalogos";
import type { QuesitosDocumentosRow, QuesitosRow } from "@/types/database";

export type ResultadoQuesitosDocumento =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotQuesitosParte }
  | { status: "erro"; mensagem: string };

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
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

function linhas(texto: string | null): BlocoConteudo[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => paragrafo(`• ${l}`));
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

  const parteRotulo = documento.parte_selecionada ? PARTE_ROTULOS[documento.parte_selecionada] : "PARTE";
  const linhasEndereco = (documento.endereco_juizo ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  const cabecalho: CabecalhoFormal = {
    tipo: "judicial",
    tituloDocumento: `QUESITOS DA ${parteRotulo.toUpperCase()}`,
    linhasEndereco: linhasEndereco.length > 0 ? linhasEndereco : ["[ENDEREÇAMENTO AO JUÍZO NÃO PREENCHIDO]"],
    processoNumero: processo.numero_processo,
    parteAutora: null,
    partesRe: null,
  };

  const secoes: SecaoCompilada[] = [];

  const blocosApresentacao: BlocoConteudo[] = [
    paragrafo(
      `${VALORES_PADRAO_PERITO.nome_perito}, Assistente Técnico(a) da parte ${parteRotulo}, vem, respeitosamente, à presença de Vossa Excelência, apresentar os QUESITOS TÉCNICO-PERICIAIS, destinados ao esclarecimento das questões técnicas controvertidas e à adequada produção da prova pericial.`,
    ),
  ];
  const pontosControvertidos = linhas(documento.pontos_controvertidos);
  if (pontosControvertidos.length > 0) {
    blocosApresentacao.push(paragrafo("Conforme delimitado na decisão de saneamento, a prova pericial deverá apreciar, especialmente, os seguintes pontos:"));
    blocosApresentacao.push(...pontosControvertidos);
  }
  secoes.push({ secaoId: "quesitos-doc-i", codigo: "apresentacao", titulo: "I — APRESENTAÇÃO", ordem: 1, blocos: blocosApresentacao });

  const blocosContexto: BlocoConteudo[] = [];
  if (documento.sintese_tese) blocosContexto.push(paragrafo(documento.sintese_tese));
  if (documento.o_que_demonstrar_pericia) blocosContexto.push(paragrafo(documento.o_que_demonstrar_pericia));
  if (blocosContexto.length > 0) {
    secoes.push({
      secaoId: "quesitos-doc-ii",
      codigo: "contextualizacao",
      titulo: "II — BREVE CONTEXTUALIZAÇÃO TÉCNICO-PERICIAL",
      ordem: 2,
      blocos: blocosContexto,
    });
  }

  secoes.push({
    secaoId: "quesitos-doc-iii",
    codigo: "quesitos_tecnicos",
    titulo: "III — QUESITOS TÉCNICO-PERICIAIS",
    ordem: 3,
    blocos: [
      {
        tipo: "quesitos",
        semResposta: true,
        itens: quesitos.map((q, i) => ({ numero: i + 1, origem: null, pergunta: q.pergunta, resposta: null })),
      },
    ],
  });

  const dataIso = documento.data_emissao ?? hojeIso();
  secoes.push({
    secaoId: "quesitos-doc-iv",
    codigo: "requerimento",
    titulo: "IV — REQUERIMENTO",
    ordem: 4,
    blocos: [
      paragrafo(
        "Diante do exposto, apresentam-se os quesitos técnico-periciais acima, requerendo-se que sejam submetidos à apreciação do(a) Sr.(a) Perito(a) Judicial e respondidos de forma individualizada e devidamente fundamentada, à luz dos elementos constantes dos autos e dos achados técnico-periciais.",
      ),
      {
        tipo: "assinatura",
        cidadeData: `${documento.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataIso)}.`,
        nome: VALORES_PADRAO_PERITO.nome_perito,
        tituloCrm: `Médica Perita - Assistente Técnica | CRM ${VALORES_PADRAO_PERITO.crm_uf}`,
      },
    ],
  });

  const modelo: ModeloLaudo = {
    processoId,
    tipoTrabalho: processo.tipo_trabalho,
    rodapeTexto: rodapeTexto(config ?? null, processo.tipo_trabalho),
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
