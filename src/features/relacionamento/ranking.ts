/**
 * Cálculos do Módulo de Relacionamento — tudo que o modelo descreve como
 * "100% automático" (faixa de contato, categoria/ranking, histórico
 * comercial, histórico financeiro) vive AQUI, nunca como coluna armazenada.
 * Ver comentário no topo da migration 20260930340000 e a nota de arquitetura
 * em [[redesign-dashboard-demandas-set-2026]] (mesmo princípio já usado nas
 * tendências do Dashboard: nunca fabricar/duplicar o que já pode ser
 * derivado de dado real).
 */
import type { RelacionamentoFaixaContato, RelacionamentoCategoria } from "@/types/enums";
import { valorDoProcesso, dataRecebimentoProcesso } from "@/features/processos/valor";
import { ETAPA_CONTRATADA_ROTULOS } from "@/features/processos/catalogos";
import type { EtapaContratada } from "@/types/enums";

export interface ProcessoVinculado {
  id: string;
  tipo_trabalho: string;
  status: string;
  honorario_arbitrado: number | null;
  honorario_apresentado: number | null;
  valor_processo: number | null;
  honorarios_recebidos_em: string | null;
  data_pagamento_at: string | null;
  etapas_contratadas: EtapaContratada[] | null;
  created_at: string;
}

/** Dias entre uma data ISO ('YYYY-MM-DD' ou timestamptz) e hoje. */
function diasDesde(dataIso: string, hojeIso: string): number {
  const a = new Date(dataIso.slice(0, 10) + "T00:00:00Z").getTime();
  const b = new Date(hojeIso.slice(0, 10) + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000);
}

/**
 * Data do último contato — MAX(relacionamento_interacoes.data), ou `null` se
 * nunca houve interação registrada (a UI trata esse caso à parte, nunca
 * como "verde": sem contato registrado não é o mesmo que contato recente).
 */
export function ultimoContato(interacoes: { data: string }[]): string | null {
  if (interacoes.length === 0) return null;
  return interacoes.reduce((max, i) => (i.data > max ? i.data : max), interacoes[0].data);
}

/** Faixa por tempo sem contato (§13): Verde 0-30d, Amarelo 31-60d, Laranja 61-90d, Vermelho +90d. */
export function faixaContato(diasSemContato: number): RelacionamentoFaixaContato {
  if (diasSemContato <= 30) return "verde";
  if (diasSemContato <= 60) return "amarelo";
  if (diasSemContato <= 90) return "laranja";
  return "vermelho";
}

/** Categoria por faturamento histórico acumulado (§13): consolidada no escritório. */
export function categoriaPorReceita(receitaHistorica: number): RelacionamentoCategoria {
  if (receitaHistorica > 100000) return "diamante";
  if (receitaHistorica >= 50000) return "ouro";
  if (receitaHistorica >= 30000) return "prata";
  return "sem_categoria";
}

export interface HistoricoComercial {
  casosEnviados: number;
  servicoMaisContratado: string | null;
  ultimoServico: string | null;
  dataUltimaContratacao: string | null;
}

export interface HistoricoFinanceiro {
  receitaTotal: number;
  receitaUltimos12Meses: number;
  receitaAnoCorrente: number;
  ticketMedio: number;
  valoresEmAberto: number;
}

/** §Histórico comercial — 100% automático a partir dos processos vinculados. */
export function calcularHistoricoComercial(processos: ProcessoVinculado[]): HistoricoComercial {
  if (processos.length === 0) {
    return { casosEnviados: 0, servicoMaisContratado: null, ultimoServico: null, dataUltimaContratacao: null };
  }
  const frequencia = new Map<string, number>();
  for (const p of processos) {
    for (const etapa of p.etapas_contratadas ?? []) {
      const rotulo = ETAPA_CONTRATADA_ROTULOS[etapa] ?? etapa;
      frequencia.set(rotulo, (frequencia.get(rotulo) ?? 0) + 1);
    }
  }
  let servicoMaisContratado: string | null = null;
  let maiorFrequencia = 0;
  for (const [servico, qtd] of frequencia) {
    if (qtd > maiorFrequencia) {
      servicoMaisContratado = servico;
      maiorFrequencia = qtd;
    }
  }
  const ordenadosPorCriacao = [...processos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const maisRecente = ordenadosPorCriacao[0];
  const ultimoServico = maisRecente.etapas_contratadas?.length
    ? ETAPA_CONTRATADA_ROTULOS[maisRecente.etapas_contratadas[maisRecente.etapas_contratadas.length - 1]]
    : maisRecente.tipo_trabalho === "assistencia_tecnica"
      ? "Assistência Técnica"
      : "Perícia Judicial";
  return {
    casosEnviados: processos.length,
    servicoMaisContratado,
    ultimoServico,
    dataUltimaContratacao: maisRecente.created_at,
  };
}

/** §Histórico financeiro — 100% automático, mesma fonte do Gráfico de Faturamento mensal (honorarios_recebidos_em / data_pagamento_at). */
export function calcularHistoricoFinanceiro(processos: ProcessoVinculado[], hojeIso: string): HistoricoFinanceiro {
  const anoCorrente = hojeIso.slice(0, 4);
  let receitaTotal = 0;
  let receitaUltimos12Meses = 0;
  let receitaAnoCorrente = 0;
  let valoresEmAberto = 0;
  let quantidadeComReceita = 0;

  for (const p of processos) {
    const valor = valorDoProcesso(p);
    if (valor == null) continue;
    const dataRecebimento = dataRecebimentoProcesso(p);
    if (dataRecebimento) {
      receitaTotal += valor;
      quantidadeComReceita++;
      if (diasDesde(dataRecebimento, hojeIso) <= 365) receitaUltimos12Meses += valor;
      if (dataRecebimento.slice(0, 4) === anoCorrente) receitaAnoCorrente += valor;
    } else if (p.status === "em_andamento") {
      valoresEmAberto += valor;
    }
  }

  return {
    receitaTotal,
    receitaUltimos12Meses,
    receitaAnoCorrente,
    ticketMedio: quantidadeComReceita > 0 ? receitaTotal / quantidadeComReceita : 0,
    valoresEmAberto,
  };
}
