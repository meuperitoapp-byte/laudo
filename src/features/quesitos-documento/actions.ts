"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuesitosDocumentosRow, QuesitosDocumentosUpdate } from "@/types/database";
import type { QuesitoParteProcessual } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/** Select-ou-cria — mesmo padrão de garantirAtestado/garantirReplica. */
export async function garantirQuesitosDocumento(
  processoId: string,
): Promise<{ error: string } | { data: QuesitosDocumentosRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("quesitos_documentos")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("quesitos_documentos")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

export async function salvarQuesitosDocumento(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id || !processoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: QuesitosDocumentosUpdate = {
    parte_selecionada: (formData.get("parte_selecionada") as QuesitoParteProcessual | "") || null,
    endereco_juizo: textoOuNull(formData.get("endereco_juizo")),
    pontos_controvertidos: textoOuNull(formData.get("pontos_controvertidos")),
    sintese_tese: textoOuNull(formData.get("sintese_tese")),
    o_que_demonstrar_pericia: textoOuNull(formData.get("o_que_demonstrar_pericia")),
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("quesitos_documentos").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/quesitos`);
  return { success: true };
}
