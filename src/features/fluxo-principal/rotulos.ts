/**
 * Rótulos em pt-BR das colunas `text` + CHECK do Fluxo Principal do Perito
 * Judicial (migration 20260911120000). Camada de apresentação — o
 * vocabulário canônico é o dos CHECKs / src/types/enums.ts.
 */

import type {
  SituacaoDeposito,
  ResponsavelAdiantamentoDeposito,
  FormaDisponibilizacaoDeposito,
  AgendamentoNecessidadeAcompanhante,
  AgendamentoDepositoPrevioExigido,
} from "@/types/enums";

/** processos.deposito_situacao — vocabulário literal do Modelo de Dados para Depósito. */
export const SITUACAO_DEPOSITO_ORDENADA: readonly SituacaoDeposito[] = [
  "nao_realizado",
  "parcial",
  "integral",
  "dispensado",
  "justica_gratuita",
  "aguardando_comprovacao",
];

export const SITUACAO_DEPOSITO_ROTULOS: Record<SituacaoDeposito, string> = {
  nao_realizado: "Ainda não realizado",
  parcial: "Parcial",
  integral: "Integral",
  dispensado: "Dispensado",
  justica_gratuita: "Justiça gratuita",
  aguardando_comprovacao: "Aguardando comprovação",
};

/** processos.deposito_responsavel_adiantamento */
export const RESPONSAVEL_ADIANTAMENTO_ORDENADA: readonly ResponsavelAdiantamentoDeposito[] = [
  "autor",
  "reu",
  "ambos",
  "outro",
];

export const RESPONSAVEL_ADIANTAMENTO_ROTULOS: Record<ResponsavelAdiantamentoDeposito, string> = {
  autor: "Autor(a)",
  reu: "Réu/Ré",
  ambos: "Ambos",
  outro: "Outro",
};

/** Situações de depósito que, pra fins do alerta de agendamento (plano §4.2), contam como "resolvido" — não geram alerta. */
export const DEPOSITO_SITUACOES_LIBERAM_AGENDAMENTO: readonly SituacaoDeposito[] = [
  "integral",
  "dispensado",
  "justica_gratuita",
];

/** processos.deposito_forma_disponibilizacao — "Forma de disponibilização" do modelo. */
export const FORMA_DISPONIBILIZACAO_ORDENADA: readonly FormaDisponibilizacaoDeposito[] = [
  "dados_bancarios",
  "conta_judicial",
  "conforme_juizo",
  "outro",
];

export const FORMA_DISPONIBILIZACAO_ROTULOS: Record<FormaDisponibilizacaoDeposito, string> = {
  dados_bancarios: "Dados bancários no corpo da manifestação",
  conta_judicial: "Depósito em conta judicial vinculada ao processo",
  conforme_juizo: "Conforme procedimento específico do Juízo/Tribunal",
  outro: "Outro",
};

/** processos.agendamento_necessidade_acompanhante */
export const AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ORDENADA: readonly AgendamentoNecessidadeAcompanhante[] = [
  "nao",
  "sim",
  "conforme_condicao_clinica",
];

export const AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ROTULOS: Record<AgendamentoNecessidadeAcompanhante, string> = {
  nao: "Não",
  sim: "Sim",
  conforme_condicao_clinica: "Conforme condição clínica / determinação",
};

/**
 * processos.agendamento_deposito_previo_exigido — só os 3 valores respondidos;
 * `null` (ainda não respondido) é tratado à parte na tela, nunca com um rótulo
 * "silencioso" que pareça uma resposta (ver comentário da coluna).
 */
export const AGENDAMENTO_DEPOSITO_PREVIO_EXIGIDO_ORDENADA: readonly AgendamentoDepositoPrevioExigido[] = [
  "sim",
  "nao",
  "nao_aplicavel",
];

export const AGENDAMENTO_DEPOSITO_PREVIO_EXIGIDO_ROTULOS: Record<AgendamentoDepositoPrevioExigido, string> = {
  sim: "Sim, este processo exige depósito prévio à perícia",
  nao: "Não exige",
  nao_aplicavel: "Não aplicável",
};
