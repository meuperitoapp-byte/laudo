"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RelatoriosTecnicosRow, RelatoriosTecnicosUpdate } from "@/types/database";
import type { RelatorioTecnicoDocumentacaoSuficiente } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/** Select-ou-cria — mesmo padrão de garantirAtestado. */
export async function garantirRelatorioTecnico(
  processoId: string,
): Promise<{ error: string } | { data: RelatoriosTecnicosRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("relatorios_tecnicos")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("relatorios_tecnicos")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

/** Salva o formulário inteiro de uma vez — mesmo padrão de salvarAtestado (muitos campos condicionais). */
export async function salvarRelatorioTecnico(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id || !processoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: RelatoriosTecnicosUpdate = {
    solicitante: textoOuNull(formData.get("solicitante")),
    objeto_relatorio: textoOuNull(formData.get("objeto_relatorio")),
    questao_tecnica_principal: textoOuNull(formData.get("questao_tecnica_principal")),
    documentos_referenciados: formData.getAll("documentos_referenciados") as string[],
    documentacao_suficiente: (formData.get("documentacao_suficiente") as RelatorioTecnicoDocumentacaoSuficiente | "") || null,
    documentacao_suficiente_detalhe: textoOuNull(formData.get("documentacao_suficiente_detalhe")),
    sintese_tecnica_caso: textoOuNull(formData.get("sintese_tecnica_caso")),
    analise_tecnica: textoOuNull(formData.get("analise_tecnica")),
    campos_complementares: formData.getAll("campos_complementares") as string[],
    campo_diagnostico_cid: textoOuNull(formData.get("campo_diagnostico_cid")),
    campo_conduta: textoOuNull(formData.get("campo_conduta")),
    campo_nexo_causal: textoOuNull(formData.get("campo_nexo_causal")),
    campo_dano: textoOuNull(formData.get("campo_dano")),
    campo_incapacidade: textoOuNull(formData.get("campo_incapacidade")),
    campo_tratamento: textoOuNull(formData.get("campo_tratamento")),
    campo_prognostico: textoOuNull(formData.get("campo_prognostico")),
    conclusao: textoOuNull(formData.get("conclusao")),
    documentos_complementares_texto: textoOuNull(formData.get("documentos_complementares_texto")),
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("relatorios_tecnicos").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/relatorio-tecnico`);
  return { success: true };
}
