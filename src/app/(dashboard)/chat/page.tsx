import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/features/chat/chat-panel";
import { ErroConsultaPagina } from "@/components/ui/erro-consulta";

const LIMITE_MENSAGENS_INICIAIS = 200;

/**
 * Chat interno — sala única, geral (pedido da Dra. Fernanda, 24/09/2026).
 * Server Component só busca o histórico inicial; a partir daí o ChatPanel
 * (Client Component) assume via Supabase Realtime.
 */
export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mensagens, error } = await supabase
    .from("chat_mensagens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMITE_MENSAGENS_INICIAIS);
  if (error) {
    console.error("Chat: falha ao buscar histórico:", error.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar o chat agora" />;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Chat</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">Conversa interna da equipe — todo mundo vê tudo.</p>
      </div>
      <ChatPanel mensagensIniciais={(mensagens ?? []).slice().reverse()} meuEmail={user?.email ?? ""} />
    </main>
  );
}
