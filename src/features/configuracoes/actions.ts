"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS, TAMANHO_MAXIMO_BYTES } from "@/features/documentos/constants";
import type { ConfiguracoesInsert, DocumentosInsert } from "@/types/database";

type ActionResult = { error: string } | { success: true };

function textoOuNull(v: FormDataEntryValue | null): string | null {
  const t = (v as string | null)?.trim();
  return t ? t : null;
}

function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Salva os dados de contato da faixa de identidade dos documentos (tabela
 * `configuracoes`, linha única id = true). Upsert — a linha pode nem existir
 * ainda na primeira vez.
 */
export async function salvarContato(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const dados: ConfiguracoesInsert = {
    id: true,
    contato_judicial_email: textoOuNull(formData.get("contato_judicial_email")),
    contato_judicial_telefone: textoOuNull(formData.get("contato_judicial_telefone")),
    contato_judicial_instagram: textoOuNull(formData.get("contato_judicial_instagram")),
    contato_at_email: textoOuNull(formData.get("contato_at_email")),
    contato_at_telefone: textoOuNull(formData.get("contato_at_telefone")),
    contato_at_instagram: textoOuNull(formData.get("contato_at_instagram")),
  };

  const { error } = await supabase.from("configuracoes").upsert(dados, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return { success: true };
}

/**
 * Upload de um asset global da conta: assinatura da perita ou logomarca
 * (documentos.tipo, processo_id = null). Sobe pro bucket compartilhado sob o
 * prefixo `_global/` (ativos-globais.ts busca por tipo + processo_id null,
 * ordenando pelo mais recente). Ao trocar, remove o asset anterior do mesmo
 * tipo — arquivo do Storage + linha da tabela — pra não acumular órfãos.
 */
export async function salvarAtivoGlobal(formData: FormData): Promise<ActionResult> {
  const tipo = formData.get("tipo");
  if (tipo !== "assinatura_perito" && tipo !== "logomarca") {
    return { error: "Tipo de asset inválido." };
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo de imagem." };
  }
  if (!arquivo.type.startsWith("image/")) {
    return { error: "O arquivo precisa ser uma imagem (PNG ou JPEG)." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { error: "Imagem maior que 25MB — não é possível enviar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `_global/${tipo}-${Date.now()}-${sanitizarNomeArquivo(arquivo.name)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (erroUpload) {
    return { error: `Erro ao enviar a imagem: ${erroUpload.message}` };
  }

  const insert: DocumentosInsert = {
    processo_id: null,
    tipo,
    nome_arquivo: arquivo.name,
    storage_path: path,
    mime_type: arquivo.type || null,
    tamanho_bytes: arquivo.size,
    enviado_por: user?.id ?? null,
  };

  const { error: erroInsert } = await supabase.from("documentos").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: erroInsert.message };
  }

  // Remove os assets anteriores do mesmo tipo (tudo que não seja o recém-criado).
  const { data: anteriores } = await supabase
    .from("documentos")
    .select("id, storage_path")
    .is("processo_id", null)
    .eq("tipo", tipo)
    .neq("storage_path", path);
  if (anteriores && anteriores.length > 0) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove(anteriores.map((d) => d.storage_path));
    await supabase
      .from("documentos")
      .delete()
      .in(
        "id",
        anteriores.map((d) => d.id),
      );
  }

  revalidatePath("/configuracoes");
  revalidatePath("/processos", "layout"); // laudos gerados a partir daqui passam a usar o novo asset
  return { success: true };
}
