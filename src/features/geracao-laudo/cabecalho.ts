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

export interface CabecalhoFormal {
  /** As linhas do endereçamento, prontas pro documento — já sem nenhum dado cru sem formatar. */
  linhasEndereco: string[];
  processoNumero: string | null;
  parteAutora: string | null;
  partesRe: string | null;
}

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
    linhasEndereco,
    processoNumero: processo.numero_processo,
    parteAutora: juntarNomesPolo(partes, "ativo") ?? processo.parte_autora,
    partesRe: juntarNomesPolo(partes, "passivo") ?? processo.partes_re,
  };
}
