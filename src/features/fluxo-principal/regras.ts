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
 * "salvo autorização expressa para prosseguir". Nasce da situação do
 * depósito já registrada — nunca de um campo à parte "este processo depende
 * de depósito prévio" (era exatamente a 2ª pergunta em aberto pra Dra.
 * Fernanda: enquanto ela não responde como isso varia por vara, o alerta
 * usa só o que já está registrado — nenhuma situação de depósito registrada
 * ainda = nada a alertar, não presume exigência que ninguém confirmou).
 */
export function verificarAlertaAgendamento(processo: {
  deposito_situacao: string | null;
}): { ok: true } | { ok: false; aviso: string } {
  if (!processo.deposito_situacao) return { ok: true };
  if ((DEPOSITO_SITUACOES_LIBERAM_AGENDAMENTO as readonly string[]).includes(processo.deposito_situacao)) {
    return { ok: true };
  }
  return {
    ok: false,
    aviso:
      "O depósito dos honorários deste processo ainda não está integral. Confirme se o Juízo autoriza agendar mesmo assim antes de prosseguir — se não tiver certeza, aguarde a complementação do depósito.",
  };
}
