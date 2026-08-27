"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { success: true };

/** Adiciona uma pessoa a um polo (Ativo/Passivo) do processo — ver processo_partes, migration 20260827100000. */
export async function adicionarParte(
  processoId: string,
  polo: "ativo" | "passivo",
  formData: FormData
): Promise<ActionResult> {
  const papel = (formData.get("papel") as string | null)?.trim();
  const nome = (formData.get("nome") as string | null)?.trim();
  if (!papel || !nome) {
    return { error: "Informe o papel e o nome." };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("processo_partes")
    .select("*", { count: "exact", head: true })
    .eq("processo_id", processoId)
    .eq("polo", polo);

  const { error } = await supabase.from("processo_partes").insert({
    processo_id: processoId,
    polo,
    papel,
    nome,
    ordem: (count ?? 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}

/** Remove uma pessoa de um polo. */
export async function removerParte(parteId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("processo_partes").delete().eq("id", parteId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}
