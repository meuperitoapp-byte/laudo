"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReplicasRow, ReplicasUpdate } from "@/types/database";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/** Select-ou-cria — mesmo padrão de garantirAtestado/garantirAnaliseContestacao. */
export async function garantirReplica(processoId: string): Promise<{ error: string } | { data: ReplicasRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("replicas")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("replicas")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

export async function salvarReplica(formData: FormData): Promise<ActionResult> {
  const replicaId = textoOuNull(formData.get("replica_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!replicaId || !processoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: ReplicasUpdate = {
    documentos_nao_considerados: textoOuNull(formData.get("documentos_nao_considerados")),
    pontos_preservados_pericia: textoOuNull(formData.get("pontos_preservados_pericia")),
    conclusao_tecnica: textoOuNull(formData.get("conclusao_tecnica")),
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("replicas").update(update).eq("id", replicaId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/replica`);
  return { success: true };
}
