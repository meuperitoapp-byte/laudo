"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BibliotecaPericialInsert,
  BibliotecaPericialUpdate,
  CategoriaBibliotecaPericial,
} from "@/types/database";
import { CATEGORIAS_ORDENADAS } from "./catalogos";

type ActionResult = { error: string } | { success: true };

const ROTA_BIBLIOTECA = "/biblioteca-pericial";

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

function categoriaValida(valor: FormDataEntryValue | null): CategoriaBibliotecaPericial | null {
  const texto = valor as string | null;
  return (CATEGORIAS_ORDENADAS as string[]).includes(texto ?? "") ? (texto as CategoriaBibliotecaPericial) : null;
}

export async function criarItemBiblioteca(formData: FormData): Promise<ActionResult> {
  const categoria = categoriaValida(formData.get("categoria"));
  const titulo = textoOuNull(formData.get("titulo"));
  const conteudo = textoOuNull(formData.get("conteudo"));
  if (!categoria) return { error: "Escolha uma categoria." };
  if (!titulo) return { error: "Dê um título." };
  if (!conteudo) return { error: "O conteúdo não pode ficar vazio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: BibliotecaPericialInsert = {
    categoria,
    titulo,
    conteudo,
    area_pericial: textoOuNull(formData.get("area_pericial")),
    fonte: textoOuNull(formData.get("fonte")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("biblioteca_pericial").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}

export async function atualizarItemBiblioteca(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const categoria = categoriaValida(formData.get("categoria"));
  const titulo = textoOuNull(formData.get("titulo"));
  const conteudo = textoOuNull(formData.get("conteudo"));
  if (!id) return { error: "Item inválido — recarregue a página e tente de novo." };
  if (!categoria) return { error: "Escolha uma categoria." };
  if (!titulo) return { error: "Dê um título." };
  if (!conteudo) return { error: "O conteúdo não pode ficar vazio." };

  const supabase = await createClient();
  const update: BibliotecaPericialUpdate = {
    categoria,
    titulo,
    conteudo,
    area_pericial: textoOuNull(formData.get("area_pericial")),
    fonte: textoOuNull(formData.get("fonte")),
  };

  const { error } = await supabase.from("biblioteca_pericial").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}

export async function excluirItemBiblioteca(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("biblioteca_pericial").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ROTA_BIBLIOTECA);
  return { success: true };
}
