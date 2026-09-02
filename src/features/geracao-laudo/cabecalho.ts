import type { ProcessoPartesRow, ProcessosRow } from "@/types/database";
import type { TipoVara } from "@/types/enums";

/**
 * Endereçamento formal ao juízo + dados do processo (CLAUDE.md > "Regra do
 * cabeçalho formal"). Só se aplica a `tipo_trabalho = 'pericia_judicial'` —
 * Assistência Técnica tem "fluxo próprio" ainda não desenhado no CLAUDE.md
 * (pode nem ter processo judicial formal), então geração de laudo formal não
 * se aplica a ela ainda.
 *
 * Decisão registrada (confirmada com a Dra./responsável técnico antes desta
 * implementação): o texto-fonte do CLAUDE.md tem um trecho variável não
 * especificado ("DA ___ VARA [...] DA [SUBSEÇÃO JUDICIÁRIA/COMARCA] DE
 * ___") — a especialização da vara (Cível, Família, do Trabalho...) não tem
 * campo próprio no cadastro do processo. Decisão: confiar em
 * `processos.vara_numero` tal como a perita digitar (ela pode escrever
 * "3ª Vara Cível", "3ª Vara do Trabalho" etc. ali, não só o número) — o
 * gerador não insere nenhuma palavra de especialização por conta própria.
 * Conector fixo por tipo_vara: "SUBSEÇÃO JUDICIÁRIA" pra federal, "COMARCA"
 * pra estadual E trabalho (as duas únicas palavras que o texto-fonte
 * oferece).
 */

const JUIZ_POR_VARA: Record<TipoVara, string> = {
  federal: "FEDERAL",
  estadual: "DE DIREITO",
  trabalho: "DO TRABALHO",
};

const CONECTOR_POR_VARA: Record<TipoVara, string> = {
  federal: "SUBSEÇÃO JUDICIÁRIA",
  estadual: "COMARCA",
  trabalho: "COMARCA",
};

/** Título do documento entre os dados de cabeçalho e a Apresentação (pedido da cliente). */
export const TITULO_LAUDO_JUDICIAL = "LAUDO PERICIAL";

/**
 * Título do documento no fluxo de Assistência Técnica. Fixo por decisão da
 * cliente (não varia conforme etapas_contratadas). Se um dia precisar variar
 * por etapa, é aqui + em montarCabecalhoAssistenciaTecnica.
 */
export const TITULO_PARECER_AT = "PARECER TÉCNICO MÉDICO-LEGAL";

/**
 * Parágrafo de identificação/bio da perita no topo do Parecer Técnico (fluxo
 * de Assistência Técnica). PLACEHOLDER ESTRUTURAL — a redação oficial ainda
 * não foi definida pela Dra. Fernanda (mesma situação de apresentacao.ts no
 * fluxo judicial). Quando chegar, troca só esta constante; o resto do
 * pipeline (compilar.ts, renderizadores) não muda.
 */
export const IDENTIFICACAO_PERITA_AT_PLACEHOLDER =
  "[IDENTIFICAÇÃO DA PERITA — AGUARDANDO REDAÇÃO OFICIAL]";

/** Endereçamento formal ao Juízo — só Perícia Judicial. */
export interface CabecalhoFormal {
  tipo: "judicial";
  /** Título do documento ("LAUDO PERICIAL") — some do renderizador, vive aqui pra simetria com o de AT. */
  tituloDocumento: string;
  /** As linhas do endereçamento, prontas pro documento — já sem nenhum dado cru sem formatar. */
  linhasEndereco: string[];
  processoNumero: string | null;
  parteAutora: string | null;
  partesRe: string | null;
}

/**
 * Cabeçalho do fluxo de Assistência Técnica (Parecer Técnico). Sem
 * endereçamento a um juízo — o documento não é uma petição. Leva a logomarca
 * no topo (o renderizador desenha a partir de AtivosGlobais), o título fixo,
 * a identificação da perita e o contexto de quem contratou.
 */
export interface CabecalhoAssistenciaTecnica {
  tipo: "assistencia_tecnica";
  tituloDocumento: string;
  /** Parágrafo de identificação da perita (placeholder estrutural por enquanto). */
  identificacaoPerita: string;
  /** Linhas de contexto do topo (só as que têm valor): Cliente/parte assistida, Advogado(a)/escritório, Processo/caso nº. */
  linhasContexto: { rotulo: string; valor: string }[];
}

export type Cabecalho = CabecalhoFormal | CabecalhoAssistenciaTecnica;

export interface ErroCabecalho {
  erro: string;
}

/** Nomes de um polo, na ordem cadastrada, unidos por " e " — ex.: "MARIA e ANA". Vazio = nenhuma pessoa cadastrada nesse polo. */
function juntarNomesPolo(partes: ProcessoPartesRow[], polo: "ativo" | "passivo"): string | null {
  const nomes = partes
    .filter((p) => p.polo === polo)
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => p.nome);
  return nomes.length > 0 ? nomes.join(" e ") : null;
}

export function montarCabecalhoFormal(
  processo: ProcessosRow,
  partes: ProcessoPartesRow[] = []
): CabecalhoFormal | ErroCabecalho {
  if (processo.tipo_trabalho !== "pericia_judicial") {
    return {
      erro:
        "Geração de laudo formal ainda só está implementada para Perícia Judicial. Assistência Técnica tem fluxo próprio (análise de viabilidade, parecer técnico etc.), ainda não desenhado.",
    };
  }
  if (!processo.tipo_vara) {
    return { erro: "Este processo não tem o tipo de vara definido — necessário para o endereçamento formal." };
  }

  const juiz = JUIZ_POR_VARA[processo.tipo_vara];
  const conector = CONECTOR_POR_VARA[processo.tipo_vara];
  const vara = processo.vara_numero?.trim() || "___";
  const cidade = processo.comarca_subsecao?.trim() || "_______________";
  const uf = processo.uf?.trim() || "___";

  const linhasEndereco = [
    `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) ${juiz} DA ${vara} VARA`,
    `DA ${conector} DE ${cidade} - ${uf}`,
  ];

  // processo_partes (Polo Ativo/Passivo, várias pessoas — ver migration
  // 20260827100000) tem prioridade; processos.parte_autora/partes_re só
  // entram como fallback pra processos cadastrados antes dessa mudança que
  // nunca ganharam nenhuma linha em processo_partes.
  return {
    tipo: "judicial",
    tituloDocumento: TITULO_LAUDO_JUDICIAL,
    linhasEndereco,
    processoNumero: processo.numero_processo,
    parteAutora: juntarNomesPolo(partes, "ativo") ?? processo.parte_autora,
    partesRe: juntarNomesPolo(partes, "passivo") ?? processo.partes_re,
  };
}

/**
 * Cabeçalho do documento de Assistência Técnica (Parecer Técnico). Não tem
 * caso de erro — AT não depende de vara nem de processo judicial formal. As
 * linhas de contexto só entram quando têm valor.
 */
export function montarCabecalhoAssistenciaTecnica(
  processo: ProcessosRow
): CabecalhoAssistenciaTecnica {
  const linhasContexto: { rotulo: string; valor: string }[] = [];
  const numeroCaso = processo.numero_processo?.trim();
  const cliente = processo.cliente_parte_assistida?.trim();
  const advogado = processo.advogado_escritorio?.trim();
  if (cliente) linhasContexto.push({ rotulo: "Contratante", valor: cliente });
  if (advogado) linhasContexto.push({ rotulo: "Advogado", valor: advogado });
  if (numeroCaso) linhasContexto.push({ rotulo: "Processo / caso nº", valor: numeroCaso });

  return {
    tipo: "assistencia_tecnica",
    tituloDocumento: TITULO_PARECER_AT,
    identificacaoPerita: IDENTIFICACAO_PERITA_AT_PLACEHOLDER,
    linhasContexto,
  };
}
