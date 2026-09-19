"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DespesasInsert, DespesasUpdate } from "@/types/database";

type ActionResult = { error: string } | { success: true };

const ROTA_FINANCEIRO = "/financeiro";

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

function valorNumerico(valor: FormDataEntryValue | null): number | null {
  const texto = (valor as string | null)?.trim().replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

export async function criarDespesa(formData: FormData): Promise<ActionResult> {
  const data = textoOuNull(formData.get("data"));
  const descricao = textoOuNull(formData.get("descricao"));
  const valor = valorNumerico(formData.get("valor"));
  if (!data) return { error: "Informe a data." };
  if (!descricao) return { error: "Descreva a despesa." };
  if (valor == null || valor <= 0) return { error: "Informe um valor válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: DespesasInsert = {
    data,
    descricao,
    valor,
    categoria: textoOuNull(formData.get("categoria")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("despesas").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}

export async function atualizarDespesa(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const data = textoOuNull(formData.get("data"));
  const descricao = textoOuNull(formData.get("descricao"));
  const valor = valorNumerico(formData.get("valor"));
  if (!id) return { error: "Despesa inválida — recarregue a página e tente de novo." };
  if (!data) return { error: "Informe a data." };
  if (!descricao) return { error: "Descreva a despesa." };
  if (valor == null || valor <= 0) return { error: "Informe um valor válido." };

  const supabase = await createClient();
  const update: DespesasUpdate = {
    data,
    descricao,
    valor,
    categoria: textoOuNull(formData.get("categoria")),
  };

  const { error } = await supabase.from("despesas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}

export async function excluirDespesa(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}
