/**
 * Regras SÍNCRONAS de aplicação do Fluxo Principal do Perito Judicial — as
 * duas travas do plano (docs/plano-modulo-fluxo-principal.md §4). NÃO é
 * "use server" — mesmo motivo de regras.ts do Pós-Laudo: um arquivo "use
 * server" só pode exportar funções async.
 */

import { DEPOSITO_SITUACOES_LIBERAM_AGENDAMENTO } from "./rotulos";

/**
 * Trava do Aceite (plano §4.1) — BLOQUEIO real, mesmo padrão da trava de
 * Retificação do Pós-Laudo: se há impedimento/suspeição ou falta de
 * competência técnica, o Aceite não pode ser gerado. `null` (pergunta ainda
 * não respondida) também bloqueia — a análise prévia é obrigatória antes de
 * aceitar, nunca inferida de outro campo.
 *
 * Não existe ainda, nesta fatia, o documento de destino (declínio/
 * impossibilidade do encargo) — o motivo só explica a trava; o reroteamento
 * de verdade fica pra quando esse documento existir.
 */
export function verificarTravaAceite(processo: {
  aceite_impedimento_suspeicao: boolean | null;
  aceite_competencia_tecnica: boolean | null;
}): { ok: true } | { ok: false; motivo: string } {
  if (processo.aceite_impedimento_suspeicao === null || processo.aceite_competencia_tecnica === null) {
    return {
      ok: false,
      motivo: "Responda a análise prévia do encargo (impedimento/suspeição e competência técnica) antes de gerar o aceite.",
    };
  }
  if (processo.aceite_impedimento_suspeicao) {
    return {
      ok: false,
      motivo:
        "Há impedimento ou suspeição declarada para este caso — o aceite não pode ser gerado. O caminho correto é declarar a impossibilidade/declínio do encargo.",
    };
  }
  if (!processo.aceite_competencia_tecnica) {
    return {
      ok: false,
      motivo:
        "Falta competência técnica declarada para o objeto deste caso — o aceite não pode ser gerado. O caminho correto é declarar a impossibilidade/declínio do encargo.",
    };
  }
  return { ok: true };
}

/**
 * Alerta de agendamento (plano §4.2) — NÃO é bloqueio: o próprio modelo diz
 * "salvo autorização expressa para prosseguir".
 *
 * CORRIGIDO em 11/09/2026 (ver migration 20260911130000): a versão anterior
 * inferia a exigência de depósito prévio a partir de `deposito_situacao`
 * sozinho — leitura errada da resposta da Dra. Fernanda ("varia processo a
 * processo, depende do juízo"). Reler o MODELO ORIGINAL mostrou que ele já
 * previa um campo próprio pra essa pergunta ("Confirmação do depósito
 * exigida antes do agendamento? Sim/Não/Não aplicável"), separado de
 * "Depósito confirmado?" — é um fato jurídico do caso, não um estado
 * observável. Fica registrado: reler a fonte primária pegou um erro que a
 * paráfrase da resposta, sozinha, não pegaria.
 *
 * `agendamento_deposito_previo_exigido === null` = ela AINDA NÃO respondeu
 * se este processo exige depósito prévio. Tratado igual a 'nao'/'nao_aplicavel'
 * pra fins de alerta (nunca bloqueia, nunca inventa exigência que ninguém
 * confirmou) — mas a TELA precisa deixar visível que a resposta está
 * pendente (pedido explícito do Jeferson, 11/09/2026): um campo
 * declaradamente não respondido é diferente de um "não" silencioso que ela
 * não escolheu, e essa diferença tem que aparecer no formulário de
 * Agendamento, não só no código.
 */
export function verificarAlertaAgendamento(processo: {
  deposito_situacao: string | null;
  agendamento_deposito_previo_exigido: string | null;
}): { ok: true } | { ok: false; aviso: string } {
  if (processo.agendamento_deposito_previo_exigido !== "sim") return { ok: true };
  if (
    processo.deposito_situacao &&
    (DEPOSITO_SITUACOES_LIBERAM_AGENDAMENTO as readonly string[]).includes(processo.deposito_situacao)
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    aviso:
      "Este processo está marcado como dependente de depósito prévio, e o depósito dos honorários ainda não está integral (ou dispensado/justiça gratuita). Confirme se o Juízo autoriza agendar mesmo assim antes de prosseguir — se não tiver certeza, aguarde a complementação do depósito.",
  };
}
