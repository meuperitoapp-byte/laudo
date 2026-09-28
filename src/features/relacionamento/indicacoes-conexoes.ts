/**
 * §16 — blocos "Indicações" e "Conexões" da tela principal. Antes só
 * existiam dentro da ficha de cada cadastro; aqui são a mesma lógica,
 * só agregada globalmente pra visão geral da Patrícia/CEO.
 */
import type { RelacionamentosRow, RelacionamentoCreditosIndicacaoRow, RelacionamentoEncaminhamentosRow } from "@/types/database";

export interface NovaIndicacao {
  id: string;
  indicadoNome: string;
  indicadorNome: string | null;
  createdAt: string;
  convertido: boolean;
}

export interface SaldoIndicador {
  indicadorId: string;
  indicadorNome: string;
  saldo: number;
}

export interface ResumoIndicacoes {
  novasIndicacoes: NovaIndicacao[];
  totalConvertidos: number;
  saldoTotalCreditos: number;
  saldosPorIndicador: SaldoIndicador[];
}

export function montarResumoIndicacoes(
  relacionamentos: RelacionamentosRow[],
  creditos: RelacionamentoCreditosIndicacaoRow[],
  idsComProcessoVinculado: Set<string>,
  limite = 8,
): ResumoIndicacoes {
  const nomePorId = new Map(relacionamentos.map((r) => [r.id, r.nome]));
  const indicados = relacionamentos
    .filter((r) => r.origem === "indicacao")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const novasIndicacoes = indicados.slice(0, limite).map((r) => ({
    id: r.id,
    indicadoNome: r.nome,
    indicadorNome: r.indicado_por_id ? (nomePorId.get(r.indicado_por_id) ?? null) : null,
    createdAt: r.created_at,
    convertido: idsComProcessoVinculado.has(r.id),
  }));

  const totalConvertidos = indicados.filter((r) => idsComProcessoVinculado.has(r.id)).length;

  const saldoPorIndicadorId = new Map<string, number>();
  for (const c of creditos) {
    const atual = saldoPorIndicadorId.get(c.indicador_id) ?? 0;
    saldoPorIndicadorId.set(c.indicador_id, atual + (c.tipo === "gerado" ? c.valor : -c.valor));
  }
  const saldosPorIndicador = [...saldoPorIndicadorId.entries()]
    .filter(([, saldo]) => saldo !== 0)
    .map(([indicadorId, saldo]) => ({ indicadorId, indicadorNome: nomePorId.get(indicadorId) ?? "—", saldo }))
    .sort((a, b) => b.saldo - a.saldo);

  return {
    novasIndicacoes,
    totalConvertidos,
    saldoTotalCreditos: saldosPorIndicador.reduce((s, x) => s + x.saldo, 0),
    saldosPorIndicador,
  };
}

export interface ConexaoPendente {
  id: string;
  origemNome: string;
  destinoNome: string | null;
  status: RelacionamentoEncaminhamentosRow["status"];
  data: string;
}

export interface ResumoConexoes {
  aguardandoEscritorio: ConexaoPendente[];
  emAcompanhamento: ConexaoPendente[];
}

export function montarResumoConexoes(
  encaminhamentos: RelacionamentoEncaminhamentosRow[],
  relacionamentos: RelacionamentosRow[],
): ResumoConexoes {
  const nomePorId = new Map(relacionamentos.map((r) => [r.id, r.nome]));
  const mapear = (e: RelacionamentoEncaminhamentosRow): ConexaoPendente => ({
    id: e.id,
    origemNome: nomePorId.get(e.origem_id) ?? "—",
    destinoNome: e.destino_id ? (nomePorId.get(e.destino_id) ?? null) : e.destino_descricao,
    status: e.status,
    data: e.data,
  });
  return {
    aguardandoEscritorio: encaminhamentos.filter((e) => e.status === "encaminhado").map(mapear),
    emAcompanhamento: encaminhamentos.filter((e) => e.status === "aceito" || e.status === "em_contato").map(mapear),
  };
}
