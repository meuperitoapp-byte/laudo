"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuesitosDocumentosRow, QuesitosDocumentosUpdate } from "@/types/database";
import type { QuesitoParteProcessual } from "@/types/enums";
import { apresentacaoPadrao } from "./catalogos";

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

  const parte = (formData.get("parte_selecionada") as QuesitoParteProcessual | "") || null;
  // Apresentação igual ao texto padrão (ela não mexeu) fica NULL — assim o
  // documento continua acompanhando a parte selecionada se ela mudar depois.
  const apresentacao = textoOuNull(formData.get("apresentacao_at"));
  const apresentacaoEditada = apresentacao && apresentacao !== apresentacaoPadrao(parte) ? apresentacao : null;

  const supabase = await createClient();
  const update: QuesitosDocumentosUpdate = {
    parte_selecionada: parte,
    endereco_juizo: textoOuNull(formData.get("endereco_juizo")),
    apresentacao_at: apresentacaoEditada,
    resumo_fatos: textoOuNull(formData.get("resumo_fatos")),
    introducao_quesitos: textoOuNull(formData.get("introducao_quesitos")),
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("quesitos_documentos").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/quesitos`);
  return { success: true };
}
