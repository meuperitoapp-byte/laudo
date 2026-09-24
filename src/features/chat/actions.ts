"use server";

import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso } from "@/features/acessos/contexto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ActionResult = { error: string } | { success: true };

/**
 * Nome de exibição no chat — reaproveita o `nome_exibicao` de quem já tem
 * perfil restrito (ex.: "Secretária", "CEO"); quem é admin (sem perfil,
 * inclusive a Dra. Fernanda) não tem esse campo, então usa o que vem antes
 * do @ no e-mail como aproximação razoável, sem pedir cadastro de nome à
 * parte só pra isso.
 */
async function nomeDoAutor(supabase: SupabaseClient<Database>, email: string): Promise<string> {
  const contexto = await obterContextoAcesso(supabase, email);
  if (contexto.tipo === "restrito") return contexto.nomeExibicao;
  return email.split("@")[0];
}

/**
 * Envia mensagem no chat interno — sala única, sem canal/DM. Não faz
 * `revalidatePath`: a tela atualiza via Realtime (ChatPanel, inscrito em
 * INSERT de `chat_mensagens`), inclusive pra quem enviou.
 */
export async function enviarMensagem(formData: FormData): Promise<ActionResult> {
  const texto = (formData.get("texto") as string | null)?.trim();
  if (!texto) return { error: "Escreva algo antes de enviar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };

  const autor_nome = await nomeDoAutor(supabase, user.email);
  const { error } = await supabase.from("chat_mensagens").insert({ autor_email: user.email, autor_nome, texto });
  if (error) return { error: error.message };

  return { success: true };
}
