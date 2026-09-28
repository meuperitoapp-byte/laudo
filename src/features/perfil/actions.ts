"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_AVATARES, TAMANHO_MAXIMO_AVATAR_BYTES } from "./constants";

type ActionResult = { error: string } | { success: true };

/** Troca acentos/espaços/símbolos por algo seguro pra virar parte de um storage_path — mesmo helper de features/documentos/actions.ts. */
function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Foto de perfil — upload da própria conta logada, nunca de outra pessoa
 * (sempre `auth.getUser()`, nunca um e-mail vindo do formulário). Chave por
 * e-mail (`perfil_avatares`), não por `perfil_usuarios`, pra funcionar
 * também pra a conta original (grandfather rule, sem linha em
 * perfil_usuarios) — ver lib/supabase/responsaveis.ts.
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione uma imagem." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_AVATAR_BYTES) {
    return { error: "Imagem maior que 5MB — escolha uma menor." };
  }
  if (!arquivo.type.startsWith("image/")) {
    return { error: "Selecione um arquivo de imagem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };

  const { data: atual } = await supabase.from("perfil_avatares").select("storage_path").eq("email", user.email).maybeSingle();

  const path = `${user.email.replace(/[^a-zA-Z0-9]/g, "_")}/${Date.now()}-${sanitizarNomeArquivo(arquivo.name)}`;
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(path, arquivo, { contentType: arquivo.type });
  if (erroUpload) return { error: `Erro ao enviar a imagem: ${erroUpload.message}` };

  const { error: erroUpsert } = await supabase
    .from("perfil_avatares")
    .upsert({ email: user.email, storage_path: path, updated_at: new Date().toISOString() });
  if (erroUpsert) {
    await supabase.storage.from(BUCKET_AVATARES).remove([path]);
    return { error: erroUpsert.message };
  }

  if (atual?.storage_path) {
    await supabase.storage.from(BUCKET_AVATARES).remove([atual.storage_path]);
  }

  revalidatePath("/configuracoes");
  revalidatePath("/chat");
  return { success: true };
}
