"use server";

import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso } from "@/features/acessos/contexto";
import { BUCKET_CHAT_ARQUIVOS, TAMANHO_MAXIMO_ARQUIVO_BYTES } from "./constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChatMensagensRow, ChatMensagensInsert } from "@/types/database";

type ActionResult = { error: string } | { success: true; mensagem: ChatMensagensRow };

/** Troca acentos/espaços/símbolos por algo seguro pra virar parte de um storage_path — mesmo helper de features/documentos/actions.ts. */
function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

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
 *
 * Aceita anexo opcional (§ pedido dela, 30/09/2026: "subir documento do
 * computador") — mensagem pode ser só texto, só arquivo, ou os dois.
 */
export async function enviarMensagem(formData: FormData): Promise<ActionResult> {
  const texto = (formData.get("texto") as string | null)?.trim() || null;
  const mencionado_nome = (formData.get("mencionado_nome") as string | null)?.trim() || null;
  const arquivo = formData.get("arquivo");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  if (!texto && !temArquivo) return { error: "Escreva algo ou anexe um arquivo antes de enviar." };
  if (temArquivo && arquivo.size > TAMANHO_MAXIMO_ARQUIVO_BYTES) {
    return { error: "Arquivo maior que 25MB — não é possível enviar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };

  let arquivo_path: string | null = null;
  let arquivo_nome: string | null = null;
  let arquivo_tipo: string | null = null;
  let arquivo_tamanho_bytes: number | null = null;

  if (temArquivo) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizarNomeArquivo(arquivo.name)}`;
    const { error: erroUpload } = await supabase.storage
      .from(BUCKET_CHAT_ARQUIVOS)
      .upload(path, arquivo, { contentType: arquivo.type || undefined });
    if (erroUpload) return { error: `Erro ao enviar o arquivo: ${erroUpload.message}` };
    arquivo_path = path;
    arquivo_nome = arquivo.name;
    arquivo_tipo = arquivo.type || null;
    arquivo_tamanho_bytes = arquivo.size;
  }

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
