import { ETAPA_CONTRATADA_ROTULOS, ETAPAS_CONTRATADAS_ORDENADAS } from "@/features/processos/catalogos";
import type { EtapaContratada } from "@/types/enums";
import type { ItemPainel } from "@/features/central-prazos/tipos";

/**
 * Filtro por serviço em "O que fazer hoje" (lote 26/10/2026, pedido dela) —
 * usa a lista de serviços (etapas contratadas) do sistema. Os itens da
 * Central não carregam o serviço como campo, então um item pertence ao
 * serviço quando (a) a categoria dele é de uma etapa específica ou (b) o
 * título cita o nome do serviço (ex.: "Entrega de parecer técnico — …",
 * "Continuidade — Análise de Viabilidade — …").
 */
const SERVICO_POR_CATEGORIA: Partial<Record<ItemPainel["categoria"], EtapaContratada>> = {
  reuniao_estrategia_pericial: "estrategia_pericial",
  estrategia_documento_prova: "estrategia_pericial",
  estrategia_proxima_acao: "estrategia_pericial",
  viabilidade_documento_faltante: "analise_viabilidade",
  viabilidade_oportunidade_probatoria: "analise_viabilidade",
  viabilidade_necessidade_especialista: "analise_viabilidade",
  viabilidade_proxima_acao: "analise_viabilidade",
  viabilidade_pos_entrega_reuniao: "analise_viabilidade",
  viabilidade_reuniao_apresentacao: "analise_viabilidade",
  viabilidade_orcamento_sem_retorno: "analise_viabilidade",
  contestacao_solicitar_documento: "analise_contestacao",
  contestacao_proxima_acao: "analise_contestacao",
  quesitos_prazo_entrega: "quesitos",
  replica_prazo_entrega: "dados_replica",
};

export const SERVICOS_FILTRO = ETAPAS_CONTRATADAS_ORDENADAS.map((codigo) => ({
  codigo,
  rotulo: ETAPA_CONTRATADA_ROTULOS[codigo],
}));

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function servicoValido(valor: string | undefined): EtapaContratada | null {
  return ETAPAS_CONTRATADAS_ORDENADAS.find((c) => c === valor) ?? null;
}

export function itemDoServico(item: ItemPainel, servico: EtapaContratada): boolean {
  if (SERVICO_POR_CATEGORIA[item.categoria] === servico) return true;
  return normalizar(item.titulo).includes(normalizar(ETAPA_CONTRATADA_ROTULOS[servico]));
}
