import type { MovimentacoesFinanceirasRow } from "@/types/database";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface MesFaturamento {
  mes: string;
  faturamento: number;
  saidas: number;
  /** Entrada por categoria — só as 2 categorias reais do negócio contam como fatia própria; o resto cai em "Outros". */
  porCategoria: { judicial: number; at: number; outros: number };
}

/** Ano (extraído de `data`, "YYYY-MM-DD") de cada movimentação, sem duplicar — pro seletor de ano do gráfico. */
export function anosComMovimentacao(movimentacoes: MovimentacoesFinanceirasRow[]): number[] {
  const anos = new Set(movimentacoes.map((m) => parseInt(m.data.slice(0, 4), 10)));
  return Array.from(anos).sort((a, b) => b - a);
}

/**
 * Agrega as movimentações de um ano em 12 meses (Jan-Dez, sempre os 12,
 * mesmo sem lançamento no mês) — pro Gráfico de Faturamento (Financeiro,
 * 25/09/2026, pedido dela: "avaliar por mês... atuar para o crescimento").
 * Categoria é catálogo livre (`MOVIMENTACAO_CATEGORIA_SEED`) — só "Perícia
 * Judicial" e "Assistência Técnica" viram fatia própria na demonstração de
 * serviços; qualquer outra (Despesa operacional, Repasse a especialista,
 * Outro, ou texto digitado livre) cai em "Outros", pra nunca inventar cor
 * nova por causa de um valor de categoria imprevisível.
 */
export function agregarPorMes(movimentacoes: MovimentacoesFinanceirasRow[], ano: number): MesFaturamento[] {
  const doAno = movimentacoes.filter((m) => m.data.startsWith(`${ano}-`));

  return MESES_ABREV.map((mes, i) => {
    const mesStr = String(i + 1).padStart(2, "0");
    const doMes = doAno.filter((m) => m.data.slice(5, 7) === mesStr);

    const entradas = doMes.filter((m) => m.tipo === "entrada");
    const saidas = doMes.filter((m) => m.tipo === "saida");

    const porCategoria = { judicial: 0, at: 0, outros: 0 };
    for (const m of entradas) {
      if (m.categoria === "Perícia Judicial") porCategoria.judicial += m.valor;
      else if (m.categoria === "Assistência Técnica") porCategoria.at += m.valor;
      else porCategoria.outros += m.valor;
    }

    return {
      mes,
      faturamento: entradas.reduce((soma, m) => soma + m.valor, 0),
      saidas: saidas.reduce((soma, m) => soma + m.valor, 0),
      porCategoria,
    };
  });
}
