import type { MovimentacoesFinanceirasRow } from "@/types/database";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface MesFaturamento {
  mes: string;
  faturamento: number;
  saidas: number;
  porCategoria: { judicial: number; at: number };
}

export interface ProcessoReceita {
  tipo_trabalho: "pericia_judicial" | "assistencia_tecnica";
  honorarios_recebidos_em: string | null;
  honorario_arbitrado: number | null;
  honorario_apresentado: number | null;
  data_pagamento_at: string | null;
  valor_processo: number | null;
}

/**
 * Ano de cada evento de receita/saída (`data`, "YYYY-MM-DD") — pro seletor de
 * ano do gráfico. Junta as duas fontes (ver `agregarPorMes`) porque uma sem a
 * outra pode não ter nenhum ano em comum ainda.
 */
export function anosComMovimentacao(processos: ProcessoReceita[], saidas: MovimentacoesFinanceirasRow[]): number[] {
  const anos = new Set<number>();
  for (const p of processos) {
    const data = p.tipo_trabalho === "pericia_judicial" ? p.honorarios_recebidos_em : p.data_pagamento_at;
    if (data) anos.add(parseInt(data.slice(0, 4), 10));
  }
  for (const s of saidas) anos.add(parseInt(s.data.slice(0, 4), 10));
  return Array.from(anos).sort((a, b) => b - a);
}

/**
 * Agrega em 12 meses (Jan-Dez, sempre os 12) o faturamento e as saídas de um
 * ano — pro Gráfico de Faturamento (Financeiro, 25/09/2026, pedido dela:
 * "avaliar por mês... atuar para o crescimento").
 *
 * IMPORTANTE (25/09/2026, achado ao investigar por que o gráfico aparecia
 * vazio): faturamento NÃO vem do ledger `movimentacoes_financeiras` — essa
 * tabela nunca foi usada de verdade (0 linhas em produção). O recebimento
 * real está nos campos de cada processo: Judicial usa
 * `honorarios_recebidos_em` (data real, já existia); Assistência Técnica usa
 * `data_pagamento_at` (novo campo, 25/09/2026 — antes só existia
 * `situacao_financeira = 'Pago'`, sem nenhuma data). Só "Saídas" continua
 * vindo do ledger, porque não existe outro lugar no sistema com dado de
 * despesa — fica genuinamente vazio até ela começar a lançar lá.
 */
export function agregarPorMes(processos: ProcessoReceita[], saidas: MovimentacoesFinanceirasRow[], ano: number): MesFaturamento[] {
  return MESES_ABREV.map((mes, i) => {
    const mesStr = String(i + 1).padStart(2, "0");
    const prefixo = `${ano}-${mesStr}`;

    const porCategoria = { judicial: 0, at: 0 };
    for (const p of processos) {
      if (p.tipo_trabalho === "pericia_judicial") {
        if (p.honorarios_recebidos_em?.startsWith(prefixo)) {
          porCategoria.judicial += p.honorario_arbitrado ?? p.honorario_apresentado ?? 0;
        }
      } else if (p.data_pagamento_at?.startsWith(prefixo)) {
        porCategoria.at += p.valor_processo ?? 0;
      }
    }

    const saidasDoMes = saidas.filter((s) => s.tipo === "saida" && s.data.startsWith(prefixo));

    return {
      mes,
      faturamento: porCategoria.judicial + porCategoria.at,
      saidas: saidasDoMes.reduce((soma, s) => soma + s.valor, 0),
      porCategoria,
    };
  });
}
