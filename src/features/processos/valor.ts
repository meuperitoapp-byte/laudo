/**
 * Valor de um processo (honorário Judicial ou valor de serviço AT) — extraído
 * de processos/page.tsx (30/09/2026) pra ser reaproveitado também pelo
 * Módulo de Relacionamento (histórico financeiro do escritório/cliente,
 * calculado a partir dos processos vinculados, nunca redigitado).
 */
export function valorDoProcesso(p: {
  tipo_trabalho: string;
  honorario_arbitrado: number | null;
  honorario_apresentado: number | null;
  valor_processo: number | null;
}): number | null {
  return p.tipo_trabalho === "assistencia_tecnica" ? p.valor_processo : (p.honorario_arbitrado ?? p.honorario_apresentado);
}

/**
 * Data em que o valor do processo foi efetivamente recebido — Judicial usa
 * `honorarios_recebidos_em`, AT usa `data_pagamento_at` (mesma fonte usada
 * pelo Gráfico de Faturamento mensal do Financeiro, 25/09/2026).
 */
export function dataRecebimentoProcesso(p: {
  tipo_trabalho: string;
  honorarios_recebidos_em: string | null;
  data_pagamento_at: string | null;
}): string | null {
  return p.tipo_trabalho === "assistencia_tecnica" ? p.data_pagamento_at : p.honorarios_recebidos_em;
}
