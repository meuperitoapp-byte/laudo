"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AtestadosRow, AtestadosUpdate } from "@/types/database";
import type {
  AtestadoTipoDocumento,
  AtestadoFinalidade,
  AtestadoConclusaoModelo,
  AtestadoNecessidadeTerceiros,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/** Select-ou-cria — mesmo padrão de garantirAnaliseViabilidade (viabilidade/actions.ts): primeira visita cria a linha, sem botão "Iniciar" separado. */
export async function garantirAtestado(
  processoId: string,
  tipoDocumento: AtestadoTipoDocumento,
): Promise<{ error: string } | { data: AtestadosRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("atestados")
    .select("*")
    .eq("processo_id", processoId)
    .eq("tipo_documento", tipoDocumento)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("atestados")
    .insert({ processo_id: processoId, tipo_documento: tipoDocumento })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

/** Salva o formulário inteiro de uma vez (um só "Salvar") — muitos campos condicionais, mais simples de raciocinar do que salvar por seção. */
export async function salvarAtestado(formData: FormData): Promise<ActionResult> {
  const atestadoId = textoOuNull(formData.get("atestado_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!atestadoId || !processoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AtestadosUpdate = {
    finalidades: formData.getAll("finalidades") as AtestadoFinalidade[],
    finalidade_outra_descricao: textoOuNull(formData.get("finalidade_outra_descricao")),
    documentos_referenciados: formData.getAll("documentos_referenciados") as string[],
    data_avaliacao: textoOuNull(formData.get("data_avaliacao")),
    diagnostico: textoOuNull(formData.get("diagnostico")),
    cid: textoOuNull(formData.get("cid")),
    condicao_atual: textoOuNull(formData.get("condicao_atual")),
    repercussao_funcional: textoOuNull(formData.get("repercussao_funcional")),
    conclusao_modelo: (formData.get("conclusao_modelo") as AtestadoConclusaoModelo | "") || null,
    conclusao_texto: textoOuNull(formData.get("conclusao_texto")),
    cc_consciencia: textoOuNull(formData.get("cc_consciencia")),
    cc_orientacao: textoOuNull(formData.get("cc_orientacao")),
    cc_memoria: textoOuNull(formData.get("cc_memoria")),
    cc_compreensao: textoOuNull(formData.get("cc_compreensao")),
    cc_juizo_critico: textoOuNull(formData.get("cc_juizo_critico")),
    cc_capacidade_decisoria: textoOuNull(formData.get("cc_capacidade_decisoria")),
    cc_comunicacao: textoOuNull(formData.get("cc_comunicacao")),
    cc_autonomia_avd: textoOuNull(formData.get("cc_autonomia_avd")),
    cc_necessidade_terceiros: (formData.get("cc_necessidade_terceiros") as AtestadoNecessidadeTerceiros | "") || null,
    capacidade_civil_texto: textoOuNull(formData.get("capacidade_civil_texto")),
    conclusao_final: textoOuNull(formData.get("conclusao_final")),
    complemento_reavaliacao_periodo: textoOuNull(formData.get("complemento_reavaliacao_periodo")),
    complemento_condicao_na_data: formData.get("complemento_condicao_na_data") === "on",
    complemento_limitada_elementos: formData.get("complemento_limitada_elementos") === "on",
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("atestados").update(update).eq("id", atestadoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}
