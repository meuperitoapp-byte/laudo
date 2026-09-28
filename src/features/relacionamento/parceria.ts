/**
 * Indicadores de parceria (§13.3 do modelo) — 100% automáticos, calculados a
 * partir de `relacionamento_encaminhamentos` e do vínculo `indicado_por_id`
 * já usado pelo canal de indicação (§10). Adaptação pragmática de um ponto
 * ambíguo do modelo: o §13 só define encaminhamento nos sentidos Cliente
 * Saúde/Profissional -> Escritório parceiro (nunca o contrário), então
 * "encaminhamentos recebidos" na ficha do Profissional (§13.3) não existe
 * nesse desenho — o que existe é "encaminhamentos realizados" por ele.
 */
import type { RelacionamentoEncaminhamentosRow, RelacionamentosRow } from "@/types/database";

export interface IndicadoresParceriaEscritorio {
  clientesEncaminhadosPelaPericons: number;
  profissionaisEncaminhados: number;
  clientesIndicadosPeloEscritorio: number;
  encaminhamentosAceitos: number;
  contratacoesInformadas: number;
  ultimaConexao: string | null;
}

export interface IndicadoresParceriaProfissional {
  clientesIndicadosAPericons: number;
  profissionaisIndicados: number;
  encaminhamentosRealizados: number;
  ultimaConexao: string | null;
}

/** §13.3 — ficha do Advogado/Escritório (sempre destino de encaminhamento, nunca origem). */
export function calcularIndicadoresParceriaEscritorio(
  escritorioId: string,
  todosEncaminhamentos: RelacionamentoEncaminhamentosRow[],
  origemTipoPorId: Map<string, RelacionamentosRow["tipo"]>,
  todosRelacionamentos: RelacionamentosRow[],
): IndicadoresParceriaEscritorio {
  const recebidos = todosEncaminhamentos.filter((e) => e.destino_id === escritorioId);
  const ultimaConexao = recebidos.reduce<string | null>((max, e) => (!max || e.data > max ? e.data : max), null);
  return {
    clientesEncaminhadosPelaPericons: recebidos.filter((e) => origemTipoPorId.get(e.origem_id) === "cliente_saude").length,
    profissionaisEncaminhados: recebidos.filter((e) => origemTipoPorId.get(e.origem_id) === "profissional").length,
    clientesIndicadosPeloEscritorio: todosRelacionamentos.filter((r) => r.indicado_por_id === escritorioId).length,
    encaminhamentosAceitos: recebidos.filter((e) => e.status === "aceito").length,
    contratacoesInformadas: recebidos.filter((e) => e.contratacao_realizada === "sim").length,
    ultimaConexao,
  };
}

/** §13.3 — ficha do Profissional (sempre origem de encaminhamento). */
export function calcularIndicadoresParceriaProfissional(
  profissionalId: string,
  todosEncaminhamentos: RelacionamentoEncaminhamentosRow[],
  todosRelacionamentos: RelacionamentosRow[],
): IndicadoresParceriaProfissional {
  const realizados = todosEncaminhamentos.filter((e) => e.origem_id === profissionalId);
  const ultimaConexao = realizados.reduce<string | null>((max, e) => (!max || e.data > max ? e.data : max), null);
  const indicados = todosRelacionamentos.filter((r) => r.indicado_por_id === profissionalId);
  return {
    clientesIndicadosAPericons: indicados.filter((r) => r.tipo === "cliente_saude").length,
    profissionaisIndicados: indicados.filter((r) => r.tipo === "profissional").length,
    encaminhamentosRealizados: realizados.length,
    ultimaConexao,
  };
}
