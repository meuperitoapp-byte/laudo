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
  PosLaudoClassificacaoTriagem,
  PosLaudoPotencialConclusao,
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

/** pos_laudo_pontos.classificacao_triagem — ordem de exibição fixa (segue o registro do módulo). */
export const CLASSIFICACAO_TRIAGEM_ORDENADA: readonly PosLaudoClassificacaoTriagem[] = [
  "questionamento_pertinente",
  "esclarecimento_legitimo",
  "quesito_suplementar_pertinente",
  "documento_novo_relevante",
  "necessidade_complementacao",
  "divergencia_interpretativa",
  "mero_inconformismo",
  "reiteracao_quesito",
  "questao_juridica_fora_objeto",
];

export const CLASSIFICACAO_TRIAGEM_ROTULOS: Record<PosLaudoClassificacaoTriagem, string> = {
  questionamento_pertinente: "Questionamento pertinente",
  esclarecimento_legitimo: "Esclarecimento legítimo",
  quesito_suplementar_pertinente: "Quesito suplementar pertinente",
  documento_novo_relevante: "Documento novo relevante",
  necessidade_complementacao: "Necessidade de complementação",
  divergencia_interpretativa: "Divergência interpretativa",
  mero_inconformismo: "Mero inconformismo",
  reiteracao_quesito: "Reiteração de quesito",
  questao_juridica_fora_objeto: "Questão jurídica fora do objeto",
};

/** pos_laudo_ciclos.pode_modificar_conclusao (e, mais adiante, pos_laudo_pontos.potencial_alterar_conclusao). */
export const POTENCIAL_CONCLUSAO_ORDENADA: readonly PosLaudoPotencialConclusao[] = [
  "nao",
  "potencialmente",
  "sim",
  "depende_complementacao",
];

export const POTENCIAL_CONCLUSAO_ROTULOS: Record<PosLaudoPotencialConclusao, string> = {
  nao: "Não",
  potencialmente: "Potencialmente",
  sim: "Sim",
  depende_complementacao: "Depende de complementação",
};
