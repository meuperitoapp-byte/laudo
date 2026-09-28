/**
 * Helpers de "tendência" pro Dashboard e Demandas (modelos de tela enviados
 * pela Dra. Fernanda, 25/09/2026) — nenhuma tabela de histórico existe hoje
 * (nunca guardamos "quantos processos em andamento havia há 30 dias"), então
 * toda variação aqui é calculada a partir de `created_at`, o único dado
 * verdadeiramente histórico e imutável que a tabela `processos` tem. Ver
 * comentário de uso em cada função — nunca inventar um número só pra
 * preencher um card do modelo.
 */

const DIA_MS = 86400000;

/** ISO (YYYY-MM-DD) de N dias atrás, em UTC — só pra comparar com `created_at`, nunca exibido. */
export function isoHaDias(dias: number): string {
  return new Date(Date.now() - dias * DIA_MS).toISOString().slice(0, 10);
}

/** Variação percentual — 0 quando `anterior` é 0 (evita Infinity/NaN no card). */
export function percentualVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/**
 * Total acumulado de processos criados até o fim de cada um dos últimos N
 * meses (inclui o mês corrente, parcial) — é o que "Evolução de processos"
 * do modelo mostra (a linha só cresce, termina no total de hoje). `datas` =
 * `created_at` de todos os processos (qualquer status).
 */
export function evolucaoAcumulada(datasCriacao: string[], meses: number): { rotulo: string; valor: number }[] {
  const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const agora = new Date();
  const pontos: { rotulo: string; valor: number }[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const referencia = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0); // último dia do mês de referência
    const fimDoMesIso = referencia.toISOString().slice(0, 10);
    const valor = datasCriacao.filter((d) => d.slice(0, 10) <= fimDoMesIso).length;
    pontos.push({ rotulo: MESES_ABREV[referencia.getMonth()], valor });
  }
  return pontos;
}

/**
 * Sparkline de um KPI "quase monotônico" (Processos, Em andamento, Perícias
 * agendadas) — mesma lógica de `evolucaoAcumulada`, mas aplicada a uma
 * condição qualquer (ex.: "está em andamento"), sempre contando só quem já
 * existia (created_at) até aquele ponto no tempo. Aproximação: não captura
 * mudança de STATUS ao longo do tempo (só existe o status ATUAL de cada
 * processo), então mede "de quem já existia até tal mês, quantos estão
 * HOJE nesta condição" — cresce/decresce de forma sensata mesmo sem
 * histórico de status, mas não é o valor exato que existia naquele mês.
 */
export function sparklineAproximada<T extends { created_at: string }>(
  processos: T[],
  condicaoAtual: (p: T) => boolean,
  pontos = 6,
): number[] {
  const doCorte = processos.filter(condicaoAtual);
  const agora = new Date();
  const valores: number[] = [];
  for (let i = pontos - 1; i >= 0; i--) {
    const referencia = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);
    const fimDoMesIso = referencia.toISOString().slice(0, 10);
    valores.push(doCorte.filter((p) => p.created_at.slice(0, 10) <= fimDoMesIso).length);
  }
  return valores;
}
