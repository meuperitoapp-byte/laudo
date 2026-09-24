import type { ContestacaoRepercussao, ContestacaoDecisao, ContestacaoProximaAcao, PrioridadeTarefa } from "@/types/enums";

/** §1 do modelo — "Repercussão para nossa tese" de cada argumento da matriz de confronto. */
export const REPERCUSSAO_ROTULOS: Record<ContestacaoRepercussao, string> = {
  nao_interfere: "Não interfere",
  exige_esclarecimento: "Exige esclarecimento",
  fragiliza_parcialmente: "Fragiliza parcialmente",
  fragiliza_significativamente: "Fragiliza significativamente",
  pode_ser_enfrentado_tecnicamente: "Pode ser enfrentado tecnicamente",
  exige_prova_complementar: "Exige prova complementar",
  deve_ser_esclarecido_pela_pericia: "Deve ser esclarecido pela perícia",
};
export const REPERCUSSAO_ORDENADAS = Object.keys(REPERCUSSAO_ROTULOS) as ContestacaoRepercussao[];

/** §2 do modelo — "O que fazer com este argumento?", múltipla seleção. */
export const DECISAO_ROTULOS: Record<ContestacaoDecisao, string> = {
  enfrentar_replica: "Enfrentar na réplica",
  contextualizar_replica: "Apenas contextualizar na réplica",
  nao_enfrentar: "Não enfrentar tecnicamente",
  solicitar_documento: "Solicitar documento complementar",
  preservar_pericia: "Preservar para a prova pericial",
  transformar_quesito: "Transformar em quesito",
  preparacao_pericia: "Utilizar na preparação para a perícia",
  atualizar_estrategia: "Atualizar a Estratégia Pericial",
  avaliar_parecer: "Avaliar necessidade de Parecer Técnico",
  outro: "Outro",
};
export const DECISOES_ORDENADAS = Object.keys(DECISAO_ROTULOS) as ContestacaoDecisao[];

/** §3 do modelo — próxima ação obrigatória ao concluir a análise. */
export const PROXIMA_ACAO_ROTULOS: Record<ContestacaoProximaAcao, string> = {
  gerar_orientacao_replica: "Gerar Orientação para Réplica",
  elaborar_quesitos: "Elaborar Quesitos",
  solicitar_documentos: "Solicitar Documentos",
  atualizar_estrategia: "Atualizar Estratégia Pericial",
  preparar_parecer_tecnico: "Preparar Parecer Técnico",
  aguardar_manifestacao: "Aguardar Manifestação/Processo",
  outro: "Outro",
};
export const PROXIMA_ACAO_ORDENADAS = Object.keys(PROXIMA_ACAO_ROTULOS) as ContestacaoProximaAcao[];

export const PRIORIDADE_ROTULOS: Record<PrioridadeTarefa, string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};
export const PRIORIDADES_ORDENADAS = Object.keys(PRIORIDADE_ROTULOS) as PrioridadeTarefa[];
