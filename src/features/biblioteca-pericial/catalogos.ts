import type { CategoriaBibliotecaPericial } from "@/types/database";

/** Rótulos de exibição — mesmo vocabulário da tela "em construção" que já existia (CLAUDE.md). */
export const CATEGORIA_ROTULOS: Record<CategoriaBibliotecaPericial, string> = {
  quesitos_por_area: "Quesitos por área",
  teses: "Teses",
  literatura: "Literatura",
  legislacao_normas: "Legislação/Normas",
  conitec_natjus_pcdt: "CONITEC / NATJUS / PCDT",
  protocolos_diretrizes: "Protocolos/Diretrizes",
  jurisprudencia_tecnica: "Jurisprudência Técnica",
};

/** Ordem fixa de exibição — mesma ordem do vocabulário acima, não alfabética. */
export const CATEGORIAS_ORDENADAS: CategoriaBibliotecaPericial[] = [
  "quesitos_por_area",
  "teses",
  "literatura",
  "legislacao_normas",
  "conitec_natjus_pcdt",
  "protocolos_diretrizes",
  "jurisprudencia_tecnica",
];

/**
 * "Área pericial" — catálogo EDITÁVEL (mesmo princípio de processos.orgao_classe,
 * ver src/features/processos/catalogos.ts): semente inicial a partir dos 3
 * modelos de laudo já mapeados, cresce sozinho conforme ela cadastra itens.
 */
export const AREA_PERICIAL_SEED = [
  "Acidente de trabalho",
  "Doença ocupacional",
  "Curatela / Capacidade civil",
  "Benefício previdenciário por incapacidade",
] as const;
