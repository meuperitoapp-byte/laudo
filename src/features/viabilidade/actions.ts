"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalisesViabilidadeRow,
  AnalisesViabilidadeUpdate,
  CasoQuestoesTecnicasInsert,
  CasoQuestoesTecnicasUpdate,
} from "@/types/database";
import type { ViabilidadeStatus } from "@/types/enums";
import { VIABILIDADE_STATUS_ORDENADOS } from "./catalogos";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/**
 * Garante que existe uma linha em `analises_viabilidade` pro processo —
 * cria com status inicial 'nao_iniciada' na primeira visita à tela, sem
 * exigir um botão "Iniciar análise" separado (mesmo espírito de outras
 * telas do sistema que criam o registro-base na primeira visita). Chamada
 * pela page (Server Component), não por um botão do usuário.
 */
export async function garantirAnaliseViabilidade(
  processoId: string,
): Promise<{ error: string } | { data: AnalisesViabilidadeRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("analises_viabilidade")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criada, error: erroInsert } = await supabase
    .from("analises_viabilidade")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { data: criada };
}

/** Cabeçalho da Janela de Análise de Viabilidade (§3 do spec) — fatia 0. */
export async function salvarCabecalhoViabilidade(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const status = formData.get("status") as ViabilidadeStatus | null;
  if (!status || !VIABILIDADE_STATUS_ORDENADOS.includes(status)) {
    return { error: "Escolha um status válido." };
  }

  const materia = formData.getAll("materia").map((v) => String(v)).filter(Boolean);
  const tagsTecnicas = formData.getAll("tags_tecnicas").map((v) => String(v)).filter(Boolean);

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    status,
    posicao_cliente_litigio: textoOuNull(formData.get("posicao_cliente_litigio")),
    especialidade: textoOuNull(formData.get("especialidade")),
    materia: materia.length > 0 ? materia : null,
    tags_tecnicas: tagsTecnicas.length > 0 ? tagsTecnicas : null,
    prazo_contratual_entrega: textoOuNull(formData.get("prazo_contratual_entrega")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Finalidade (§4) + Narrativas (§5) + Objeto (§6, exceto questões técnicas) — fatia 1. */
export async function salvarFinalidadeNarrativasObjeto(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const finalidade = formData.getAll("finalidade").map((v) => String(v)).filter(Boolean);

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    finalidade,
    pergunta_central_advogado: textoOuNull(formData.get("pergunta_central_advogado")),
    narrativa_advogado: textoOuNull(formData.get("narrativa_advogado")),
    narrativa_cliente: textoOuNull(formData.get("narrativa_cliente")),
    tese_inicial_apresentada: textoOuNull(formData.get("tese_inicial_apresentada")),
    narrativa_fonte_informacao: textoOuNull(formData.get("narrativa_fonte_informacao")),
    objeto_analise: textoOuNull(formData.get("objeto_analise")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** "+ Adicionar questão técnica" (§6) — CRUD independente, ligado a processo_id (não à análise). */
export async function criarQuestaoTecnica(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const questao = textoOuNull(formData.get("questao"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!questao) return { error: "Descreva a questão técnica." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const numeroBruto = textoOuNull(formData.get("numero"));
  const insert: CasoQuestoesTecnicasInsert = {
    processo_id: processoId,
    numero: numeroBruto ? Number(numeroBruto) : null,
    questao,
    tema: textoOuNull(formData.get("tema")),
    status: textoOuNull(formData.get("status")),
    resposta_preliminar: textoOuNull(formData.get("resposta_preliminar")),
    fonte: textoOuNull(formData.get("fonte")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_questoes_tecnicas").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarQuestaoTecnica(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const questao = textoOuNull(formData.get("questao"));
  if (!id || !processoId) return { error: "Questão técnica inválida — recarregue a página e tente de novo." };
  if (!questao) return { error: "Descreva a questão técnica." };

  const numeroBruto = textoOuNull(formData.get("numero"));
  const supabase = await createClient();
  const update: CasoQuestoesTecnicasUpdate = {
    numero: numeroBruto ? Number(numeroBruto) : null,
    questao,
    tema: textoOuNull(formData.get("tema")),
    status: textoOuNull(formData.get("status")),
    resposta_preliminar: textoOuNull(formData.get("resposta_preliminar")),
    fonte: textoOuNull(formData.get("fonte")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_questoes_tecnicas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirQuestaoTecnica(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_questoes_tecnicas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}
