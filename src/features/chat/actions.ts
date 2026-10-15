"use server";

import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso } from "@/features/acessos/contexto";
import { nomeExibicaoDoEmail } from "@/lib/supabase/responsaveis";
import { lerMetadadosArquivo } from "@/lib/supabase/upload-direto";
import { BUCKET_CHAT_ARQUIVOS } from "./constants";
import { contarNaoLidasDe } from "./nao-lidas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChatMensagensRow, ChatMensagensInsert } from "@/types/database";

type ActionResult = { error: string } | { success: true; mensagem: ChatMensagensRow };

/**
 * Nome de exibição no chat — reaproveita o `nome_exibicao` de quem já tem
 * perfil restrito (ex.: "Secretária", "CEO"). Bug corrigido (30/09/2026,
 * print dela mostrando "analisedeviabilidade.pericons" no lugar do nome):
 * quem é admin sem perfil caía no prefixo cru do e-mail — agora usa a MESMA
 * função de fallback ("Dra. Fernanda", grandfather rule) já usada em todo
 * campo Responsável do sistema, em vez de inventar um fallback próprio aqui.
 */
async function nomeDoAutor(supabase: SupabaseClient<Database>, email: string): Promise<string> {
  const contexto = await obterContextoAcesso(supabase, email);
  if (contexto.tipo === "restrito") return contexto.nomeExibicao;
  return nomeExibicaoDoEmail(email);
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
 *
 * Aceita anexo opcional (§ pedido dela, 30/09/2026: "subir documento do
 * computador") — mensagem pode ser só texto, só arquivo, ou os dois.
 */
export async function enviarMensagem(formData: FormData): Promise<ActionResult> {
  const texto = (formData.get("texto") as string | null)?.trim() || null;
  const mencionado_nome = (formData.get("mencionado_nome") as string | null)?.trim() || null;
  // Anexo já subiu direto do navegador (src/lib/supabase/upload-direto.ts) —
  // aqui só chegam os metadados.
  const arquivo = lerMetadadosArquivo(formData);

  if (!texto && !arquivo) return { error: "Escreva algo ou anexe um arquivo antes de enviar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };

  const arquivo_path = arquivo?.path ?? null;
  const arquivo_nome = arquivo?.nome ?? null;
  const arquivo_tipo = arquivo?.tipo ?? null;
  const arquivo_tamanho_bytes = arquivo?.tamanho ?? null;

  const autor_nome = await nomeDoAutor(supabase, user.email);
  const payload: ChatMensagensInsert = {
    autor_email: user.email,
    autor_nome,
    texto,
    mencionado_nome,
    arquivo_path,
    arquivo_nome,
    arquivo_tipo,
    arquivo_tamanho_bytes,
  };
  const { data, error } = await supabase.from("chat_mensagens").insert(payload).select("*").single();
  if (error) {
    if (arquivo_path) await supabase.storage.from(BUCKET_CHAT_ARQUIVOS).remove([arquivo_path]);
    return { error: error.message };
  }

  return { success: true, mensagem: data };
}

/** Recontagem pedida pelo menu (fallback do Realtime: a cada minuto e quando a aba volta ao foco). `null` = não deu pra contar agora. */
export async function contarChatNaoLidas(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  try {
    return await contarNaoLidasDe(supabase, user.email);
  } catch (e) {
    console.error("Chat: falha ao contar não lidas:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Marca o Chat como lido agora pra quem está logado — chamado ao abrir a tela do Chat e a cada mensagem que chega com ela aberta. */
export async function marcarChatLido(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;
  const { error } = await supabase
    .from("chat_leituras")
    .upsert({ usuario_email: user.email, lido_em: new Date().toISOString() });
  if (error) console.error("Chat: falha ao marcar como lido:", error.message);
}
