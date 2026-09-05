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
  PosLaudoNaturezaErro,
  PosLaudoClassificacaoTriagem,
  PosLaudoPotencialConclusao,
  PosLaudoRepercussaoPonto,
  PosLaudoRepercussaoLaudo,
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

/** pos_laudo_pontos.repercussao — o que o ponto (já respondido) faz no laudo original. */
export const REPERCUSSAO_PONTO_ORDENADA: readonly PosLaudoRepercussaoPonto[] = [
  "ponto_ja_esclarecido",
  "fundamentacao_complementada",
  "retificacao_necessaria",
  "conclusao_parcialmente_modificada",
  "sem_repercussao",
];

export const REPERCUSSAO_PONTO_ROTULOS: Record<PosLaudoRepercussaoPonto, string> = {
  ponto_ja_esclarecido: "Ponto já esclarecido no laudo",
  fundamentacao_complementada: "Fundamentação complementada",
  retificacao_necessaria: "Retificação necessária",
  conclusao_parcialmente_modificada: "Conclusão parcialmente modificada",
  sem_repercussao: "Sem repercussão",
};

/** pos_laudo_ciclos.repercussao_laudo — síntese de ciclo (modelo Esclarecimentos VI / Complementação IX). */
export const REPERCUSSAO_LAUDO_ORDENADA: readonly PosLaudoRepercussaoLaudo[] = [
  "mantido_integralmente",
  "complementado_sem_alterar",
  "retificacao_sem_repercussao",
  "modificacao_parcial",
  "revisao_substancial",
  "substituicao_conclusao",
];

export const REPERCUSSAO_LAUDO_ROTULOS: Record<PosLaudoRepercussaoLaudo, string> = {
  mantido_integralmente: "Mantido integralmente",
  complementado_sem_alterar: "Complementado, sem alterar a conclusão",
  retificacao_sem_repercussao: "Retificação de erro material, sem repercussão",
  modificacao_parcial: "Modificação parcial da fundamentação e/ou conclusão",
  revisao_substancial: "Revisão substancial da conclusão",
  substituicao_conclusao: "Substituição da conclusão anterior",
};

/** Valores de repercussao_laudo que exigem "Nova Conclusão Vigente" (trava de aplicação). */
export const REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO: readonly PosLaudoRepercussaoLaudo[] = [
  "modificacao_parcial",
  "revisao_substancial",
  "substituicao_conclusao",
];

/** pos_laudo_retificacao_itens.natureza_erro — seção II do modelo de Retificação de Erro Material. */
export const NATUREZA_ERRO_ORDENADA: readonly PosLaudoNaturezaErro[] = [
  "digitacao",
  "grafia",
  "nome_identificacao",
  "data",
  "numero_valor",
  "pagina_item_referencia",
  "troca_omissao",
  "formatacao",
  "outro",
];

export const NATUREZA_ERRO_ROTULOS: Record<PosLaudoNaturezaErro, string> = {
  digitacao: "Erro de digitação",
  grafia: "Erro de grafia",
  nome_identificacao: "Nome/identificação incorreta",
  data: "Data incorreta",
  numero_valor: "Número/valor transcrito incorretamente",
  pagina_item_referencia: "Página/item/referência incorreta",
  troca_omissao: "Troca ou omissão material de palavra/expressão",
  formatacao: "Erro de formatação com repercussão na leitura",
  outro: "Outro erro material",
};
