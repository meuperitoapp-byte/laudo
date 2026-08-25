"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RespostaEvidenciasInsert } from "@/types/database";

type ActionResult = { error: string } | { success: true };

/**
 * Vincula uma evidência (achado clínico de outra resposta, ou documento) a
 * uma resposta-conclusão já confirmada (CLAUDE.md > "Regra: rastreabilidade").
 * `respostaId` precisa ser o id de uma linha JÁ SALVA em respostas_processo —
 * é por isso que a UI (campo-field.tsx) só libera isto depois que a seção foi
 * salva com a conclusão confirmada, nunca antes.
 */
export async function vincularEvidencia(input: {
  processoId: string;
  secaoId: string;
  respostaId: string;
  documentoId?: string;
  respostaReferenciadaId?: string;
  observacao?: string;
}): Promise<ActionResult> {
  if (!input.documentoId && !input.respostaReferenciadaId) {
    return { error: "Selecione um documento ou uma resposta pra vincular." };
  }
  if (input.respostaReferenciadaId === input.respostaId) {
    return { error: "Não é possível vincular uma conclusão a si mesma." };
  }

  const supabase = await createClient();
  const insert: RespostaEvidenciasInsert = {
    resposta_id: input.respostaId,
    documento_id: input.documentoId ?? null,
    resposta_referenciada_id: input.respostaReferenciadaId ?? null,
    observacao: input.observacao?.trim() || null,
  };

  const { error } = await supabase.from("resposta_evidencias").insert(insert);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${input.processoId}/preenchimento/${input.secaoId}`);
  return { success: true };
}

export async function desvincularEvidencia(
  evidenciaId: string,
  processoId: string,
  secaoId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("resposta_evidencias").delete().eq("id", evidenciaId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}/preenchimento/${secaoId}`);
  return { success: true };
}
