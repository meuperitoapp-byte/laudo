import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Quantas mensagens de OUTRAS pessoas chegaram depois da última vez que
 * `email` abriu o Chat (lote 15/10/2026, relato dela: "não aparece que tem
 * novas mensagens para mim"). Sem registro de leitura ainda = tudo que os
 * outros mandaram conta como novo (ela abre o Chat uma vez e zera).
 * Módulo comum (não "use server") — usada pelo layout do dashboard (com a
 * sessão que ele já tem, sem outra ida ao Auth) e pela action de recontagem.
 */
export async function contarNaoLidasDe(supabase: SupabaseClient<Database>, email: string): Promise<number> {
  const { data: leitura, error: erroLeitura } = await supabase
    .from("chat_leituras")
    .select("lido_em")
    .eq("usuario_email", email)
    .maybeSingle();
  if (erroLeitura) throw new Error(erroLeitura.message);

  let consulta = supabase.from("chat_mensagens").select("id", { count: "exact", head: true }).neq("autor_email", email);
  if (leitura?.lido_em) consulta = consulta.gt("created_at", leitura.lido_em);
  const { count, error } = await consulta;
  if (error) throw new Error(error.message);
  return count ?? 0;
}
