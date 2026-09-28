import { createClient } from "@/lib/supabase/server";
import { BUCKET_AVATARES } from "./constants";

/** Foto de perfil de UM e-mail — usado em Configurações (a própria conta logada). */
export async function buscarAvatarUrl(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("perfil_avatares").select("storage_path").eq("email", email).maybeSingle();
  if (!data?.storage_path) return null;
  const { data: urlData } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(data.storage_path);
  return urlData.publicUrl;
}

/**
 * Todas as fotos de perfil cadastradas, por e-mail — bucket público, então
 * `getPublicUrl` é síncrono (sem custo de assinar uma URL por mensagem do
 * chat, que pode ter muitas linhas). `null` no Map = sem foto (a tela cai
 * pro círculo colorido com inicial).
 */
export async function buscarTodosAvatares(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("perfil_avatares").select("email, storage_path");
  if (error) {
    console.error("Avatares: falha ao buscar fotos de perfil:", error.message);
    return new Map();
  }
  const mapa = new Map<string, string>();
  for (const row of data ?? []) {
    const { data: urlData } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(row.storage_path);
    mapa.set(row.email, urlData.publicUrl);
  }
  return mapa;
}
