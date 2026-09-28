"use server";

import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso } from "@/features/acessos/contexto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChatMensagensRow } from "@/types/database";

type ActionResult = { error: string } | { success: true; mensagem: ChatMensagensRow };

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
 * INSERT de `chat_mensagens`). Devolve a linha criada pra permitir eco
 * otimista de quem enviou — sem otimismo local, a própria mensagem só
 * aparecia quando o evento Realtime voltasse, e qualquer atraso de rede
 * fazia parecer que a mensagem "sumiu" (relato dela, 30/09/2026). O
 * ChatPanel usa o `id` devolvido aqui pra nunca duplicar quando o evento
 * Realtime desse mesmo insert chegar depois.
 */
export async function enviarMensagem(formData: FormData): Promise<ActionResult> {
  const texto = (formData.get("texto") as string | null)?.trim();
  if (!texto) return { error: "Escreva algo antes de enviar." };
  const mencionado_nome = (formData.get("mencionado_nome") as string | null)?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };

  const autor_nome = await nomeDoAutor(supabase, user.email);
  const { data, error } = await supabase
    .from("chat_mensagens")
    .insert({ autor_email: user.email, autor_nome, texto, mencionado_nome })
    .select("*")
    .single();
  if (error) return { error: error.message };

  return { success: true, mensagem: data };
}
