import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/features/chat/chat-panel";
import { listarNomesResponsaveis, nomeExibicaoDoEmail } from "@/lib/supabase/responsaveis";
import { buscarTodosAvatares } from "@/features/perfil/avatares";
import { ErroConsultaPagina } from "@/components/ui/erro-consulta";

const LIMITE_MENSAGENS_INICIAIS = 200;

/**
 * Chat interno — sala única, geral (pedido da Dra. Fernanda, 24/09/2026).
 * Server Component só busca o histórico inicial; a partir daí o ChatPanel
 * (Client Component) assume via Supabase Realtime. "Direcionar para" e o
 * filtro "só minhas menções" (30/09/2026, pedido dela: "minha conversa com
 * a secretária é muito mais intensa que com o financeiro") precisam de
 * `meuNome` pra comparar com `mencionado_nome`.
 */
export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: mensagens, error }, nomesResponsaveis, meuNome, avataresMap] = await Promise.all([
    supabase.from("chat_mensagens").select("*").order("created_at", { ascending: false }).limit(LIMITE_MENSAGENS_INICIAIS),
    listarNomesResponsaveis(),
    nomeExibicaoDoEmail(user?.email),
    buscarTodosAvatares(),
  ]);
  if (error) {
    console.error("Chat: falha ao buscar histórico:", error.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar o chat agora" />;
  }

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-3">
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Chat</h1>
      <ChatPanel
        mensagensIniciais={(mensagens ?? []).slice().reverse()}
        meuEmail={user?.email ?? ""}
        meuNome={meuNome}
        nomesResponsaveis={nomesResponsaveis}
        avatares={Object.fromEntries(avataresMap)}
      />
    </main>
  );
}
