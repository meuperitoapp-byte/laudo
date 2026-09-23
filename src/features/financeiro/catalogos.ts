/**
 * Categoria de movimentação — catálogo EDITÁVEL (mesmo princípio de
 * processos.orgao_classe: texto livre sem CHECK, ComboboxCatalogo, cresce
 * sozinho a partir do que ela for cadastrando). Cobre entrada E saída no
 * mesmo catálogo — ela quem escolhe qual usar conforme o tipo do
 * lançamento (migration 20260930140000, unificação de `despesas`).
 */
export const MOVIMENTACAO_CATEGORIA_SEED = [
  "Perícia Judicial",
  "Assistência Técnica",
  "Repasse a especialista",
  "Despesa operacional",
  "Imposto/Taxa",
  "Mensalidade de Sistema/App",
  "Outro",
] as const;

/** Conta — catálogo EDITÁVEL, mesmo princípio de categoria. */
export const MOVIMENTACAO_CONTA_SEED = ["Asaas", "Inter", "Banco do Brasil"] as const;

export const TIPO_MOVIMENTACAO_ROTULOS = {
  entrada: "Entrada",
  saida: "Saída",
} as const;
