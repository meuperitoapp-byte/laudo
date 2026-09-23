"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MovimentacoesFinanceirasInsert, MovimentacoesFinanceirasUpdate } from "@/types/database";
import type { TipoMovimentacaoFinanceira } from "@/types/enums";

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

/** Entrada é SEMPRE vinculada a um processo (decisão dela, 21/09/2026) — saída pode ou não ter. */
export async function criarMovimentacao(formData: FormData): Promise<ActionResult> {
  const data = textoOuNull(formData.get("data"));
  const tipo = formData.get("tipo") as TipoMovimentacaoFinanceira | null;
  const valor = valorNumerico(formData.get("valor"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!data) return { error: "Informe a data." };
  if (tipo !== "entrada" && tipo !== "saida") return { error: "Escolha entrada ou saída." };
  if (valor == null || valor <= 0) return { error: "Informe um valor válido." };
  if (tipo === "entrada" && !processoId) return { error: "Entrada precisa estar vinculada a um processo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: MovimentacoesFinanceirasInsert = {
    data,
    tipo,
    valor,
    processo_id: processoId,
    categoria: textoOuNull(formData.get("categoria")),
    conta: textoOuNull(formData.get("conta")),
    observacoes: textoOuNull(formData.get("observacoes")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("movimentacoes_financeiras").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}

export async function atualizarMovimentacao(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const data = textoOuNull(formData.get("data"));
  const tipo = formData.get("tipo") as TipoMovimentacaoFinanceira | null;
  const valor = valorNumerico(formData.get("valor"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id) return { error: "Movimentação inválida — recarregue a página e tente de novo." };
  if (!data) return { error: "Informe a data." };
  if (tipo !== "entrada" && tipo !== "saida") return { error: "Escolha entrada ou saída." };
  if (valor == null || valor <= 0) return { error: "Informe um valor válido." };
  if (tipo === "entrada" && !processoId) return { error: "Entrada precisa estar vinculada a um processo." };

  const supabase = await createClient();
  const update: MovimentacoesFinanceirasUpdate = {
    data,
    tipo,
    valor,
    processo_id: processoId,
    categoria: textoOuNull(formData.get("categoria")),
    conta: textoOuNull(formData.get("conta")),
    observacoes: textoOuNull(formData.get("observacoes")),
  };

  const { error } = await supabase.from("movimentacoes_financeiras").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}

export async function excluirMovimentacao(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("movimentacoes_financeiras").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_FINANCEIRO);
  return { success: true };
}
