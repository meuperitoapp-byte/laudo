"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalisesContestacaoRow,
  AnalisesContestacaoUpdate,
  ContestacaoArgumentosInsert,
  ContestacaoArgumentosUpdate,
} from "@/types/database";
import type { ContestacaoRepercussao, ContestacaoDecisao, ContestacaoProximaAcao, PrioridadeTarefa } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/** Select-ou-cria — mesmo padrão de garantirAtestado/garantirAnaliseViabilidade: primeira visita cria a linha. */
export async function garantirAnaliseContestacao(
  processoId: string,
): Promise<{ error: string } | { data: AnalisesContestacaoRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("analises_contestacao")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("analises_contestacao")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

export async function criarArgumentoContestacao(analiseId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("contestacao_argumentos")
    .select("ordem")
    .eq("analise_id", analiseId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };

  const insert: ContestacaoArgumentosInsert = {
    analise_id: analiseId,
    ordem: (ultimo?.ordem ?? 0) + 1,
    argumento: "Novo argumento — edite abaixo",
  };
  const { error } = await supabase.from("contestacao_argumentos").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/analise-contestacao`);
  return { success: true };
}

export async function salvarArgumentoContestacao(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id || !processoId) return { error: "Argumento inválido — recarregue a página e tente de novo." };

  const argumento = textoOuNull(formData.get("argumento"));
  if (!argumento) return { error: "O que a defesa sustenta não pode ficar vazio." };

  const supabase = await createClient();
  const update: ContestacaoArgumentosUpdate = {
    argumento,
    analise_tecnica: textoOuNull(formData.get("analise_tecnica")),
    evidencia_documento: textoOuNull(formData.get("evidencia_documento")),
    repercussao: (formData.get("repercussao") as ContestacaoRepercussao | "") || null,
    orientacao: textoOuNull(formData.get("orientacao")),
    decisoes: formData.getAll("decisoes") as ContestacaoDecisao[],
    decisao_outra: textoOuNull(formData.get("decisao_outra")),
    incluir_na_replica: formData.get("incluir_na_replica") === "on",
  };

  const { error } = await supabase.from("contestacao_argumentos").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/analise-contestacao`);
  return { success: true };
}

export async function excluirArgumentoContestacao(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("contestacao_argumentos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/processos/${processoId}/analise-contestacao`);
  return { success: true };
}

/** Salva o bloco "Próxima ação obrigatória" (§3) — um só formulário, no rodapé da tela. */
export async function salvarProximaAcaoContestacao(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AnalisesContestacaoUpdate = {
    proxima_acao: (formData.get("proxima_acao") as ContestacaoProximaAcao | "") || null,
    proxima_acao_outra: textoOuNull(formData.get("proxima_acao_outra")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    prioridade: (formData.get("prioridade") as PrioridadeTarefa) || "normal",
    concluida: formData.get("concluida") === "on",
  };

  const { error } = await supabase.from("analises_contestacao").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/analise-contestacao`);
  return { success: true };
}
