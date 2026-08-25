"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RespostasReutilizaveisInsert, RespostasReutilizaveisUpdate } from "@/types/database";

type ActionResult = { error: string } | { success: true };

const ROTA_BIBLIOTECA = "/respostas-reutilizaveis";

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/**
 * Cria uma resposta reutilizável do zero (Parte 1 — biblioteca). `campo_id` e
 * `tipo_laudo_id` são opcionais (CLAUDE.md: campo_id preso a um campo
 * específico; tipo_laudo_id pra texto mais genérico do tipo de laudo, ex.:
 * metodologia). A UI (biblioteca-panel.tsx) garante que campo_id só vem
 * preenchido junto com o tipo_laudo_id correspondente — nunca um campo "solto"
 * sem o tipo, pra não complicar o agrupamento da listagem.
 */
export async function criarRespostaReutilizavel(formData: FormData): Promise<ActionResult> {
  const titulo = textoOuNull(formData.get("titulo"));
  const conteudo = textoOuNull(formData.get("conteudo"));
  if (!titulo) return { error: "Dê um título pra essa resposta." };
  if (!conteudo) return { error: "O conteúdo não pode ficar vazio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: RespostasReutilizaveisInsert = {
    titulo,
    conteudo,
    tipo_laudo_id: textoOuNull(formData.get("tipo_laudo_id")),
    campo_id: textoOuNull(formData.get("campo_id")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("respostas_reutilizaveis").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}

export async function atualizarRespostaReutilizavel(input: {
  id: string;
  titulo: string;
  conteudo: string;
  tipoLaudoId: string | null;
  campoId: string | null;
}): Promise<ActionResult> {
  const titulo = input.titulo.trim();
  const conteudo = input.conteudo.trim();
  if (!titulo) return { error: "Dê um título pra essa resposta." };
  if (!conteudo) return { error: "O conteúdo não pode ficar vazio." };

  const supabase = await createClient();
  const update: RespostasReutilizaveisUpdate = {
    titulo,
    conteudo,
    tipo_laudo_id: input.tipoLaudoId,
    campo_id: input.campoId,
  };

  const { error } = await supabase.from("respostas_reutilizaveis").update(update).eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}

export async function excluirRespostaReutilizavel(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("respostas_reutilizaveis").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}

/**
 * Parte 2 — "Salvar como reutilizável" a partir de um campo do preenchimento.
 * Sempre grava campo_id JUNTO com o tipo_laudo_id daquele campo (nunca um
 * sem o outro) — é o que garante que a listagem da biblioteca (agrupada por
 * tipo_laudo_id) nunca perde de vista uma resposta presa a um campo.
 */
export async function salvarComoReutilizavel(input: {
  campoId: string;
  tipoLaudoId: string;
  titulo: string;
  conteudo: string;
}): Promise<ActionResult> {
  const titulo = input.titulo.trim();
  const conteudo = input.conteudo.trim();
  if (!titulo) return { error: "Dê um título pra essa resposta." };
  if (!conteudo) return { error: "Não há texto nesse campo pra salvar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: RespostasReutilizaveisInsert = {
    titulo,
    conteudo,
    campo_id: input.campoId,
    tipo_laudo_id: input.tipoLaudoId,
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("respostas_reutilizaveis").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}
