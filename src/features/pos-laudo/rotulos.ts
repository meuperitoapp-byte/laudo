/**
 * Rótulos em pt-BR das colunas `text` + CHECK do Módulo Pós-Laudo
 * (migration 20260905120000_pos_laudo_schema.sql). Camada de apresentação —
 * o vocabulário canônico é o dos CHECKs / src/types/enums.ts.
 */

import type {
  PosLaudoFluxo,
  PosLaudoCicloStatus,
  PosLaudoOrigem,
  PosLaudoNatureza,
} from "@/types/enums";

export const FLUXO_ROTULOS: Record<PosLaudoFluxo, string> = {
  judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

export const CICLO_STATUS_ROTULOS: Record<PosLaudoCicloStatus, string> = {
  aberto: "Aberto",
  triagem: "Em triagem",
  em_resposta: "Em resposta",
  aguardando_protocolo: "Aguardando protocolo",
  protocolado: "Protocolado",
  encerrado: "Encerrado",
};

export const ORIGEM_ROTULOS: Record<PosLaudoOrigem, string> = {
  autor: "Autor",
  reu: "Réu",
  ambos: "Ambos",
  juizo: "Juízo",
  mp: "Ministério Público",
  outro: "Outro",
};

/** Ordem de exibição fixa (não alfabética) — segue o registro de entrada do módulo. */
export const NATUREZA_ORDENADA: readonly PosLaudoNatureza[] = [
  "concordancia",
  "impugnacao",
  "esclarecimentos",
  "quesitos_suplementares",
  "complementacao",
  "documento_novo",
  "nova_pericia",
  "determinacao_judicial",
  "outra",
];

export const NATUREZA_ROTULOS: Record<PosLaudoNatureza, string> = {
  concordancia: "Concordância",
  impugnacao: "Impugnação",
  esclarecimentos: "Esclarecimentos",
  quesitos_suplementares: "Quesitos suplementares",
  complementacao: "Complementação",
  documento_novo: "Documento novo",
  nova_pericia: "Nova perícia",
  determinacao_judicial: "Determinação judicial",
  outra: "Outra",
};
