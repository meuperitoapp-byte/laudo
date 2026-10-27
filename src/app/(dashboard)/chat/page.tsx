import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/features/chat/chat-panel";
import { listarNomesResponsaveis, nomeExibicaoDoEmail, mapaNomesPorEmail } from "@/lib/supabase/responsaveis";
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

  const [{ data: mensagens, error }, nomesResponsaveis, meuNome, avataresMap, { data: casosDb }] = await Promise.all([
    supabase.from("chat_mensagens").select("*").order("created_at", { ascending: false }).limit(LIMITE_MENSAGENS_INICIAIS),
    listarNomesResponsaveis(),
    nomeExibicaoDoEmail(user?.email),
    buscarTodosAvatares(),
    // Casos pra ligar a conversa (27/10/2026) — em andamento, mais recentes primeiro.
    supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora")
      .eq("status", "em_andamento")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const casos = (casosDb ?? []).map((p) => ({
    id: p.id,
    rotulo: p.periciando_nome || p.parte_autora || p.numero_processo || "Processo sem identificação",
  }));
  // Casos já citados em mensagens antigas que não estão mais "em andamento".
  const idsMensagens = Array.from(new Set((mensagens ?? []).map((m) => m.processo_id).filter((x): x is string => Boolean(x))));
  const idsFaltando = idsMensagens.filter((id) => !casos.some((c) => c.id === id));
  if (idsFaltando.length > 0) {
    const { data: extras } = await supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora")
      .in("id", idsFaltando);
    for (const p of extras ?? []) {
      casos.push({ id: p.id, rotulo: p.periciando_nome || p.parte_autora || p.numero_processo || "Processo sem identificação" });
    }
  }
  if (error) {
    console.error("Chat: falha ao buscar histórico:", error.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar o chat agora" />;
  }

  const emailsAutores = Array.from(new Set((mensagens ?? []).map((m) => m.autor_email)));
  const nomesPorEmail = await mapaNomesPorEmail(emailsAutores);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <ChatPanel
        mensagensIniciais={(mensagens ?? []).slice().reverse()}
        meuEmail={user?.email ?? ""}
        meuNome={meuNome}
        nomesResponsaveis={nomesResponsaveis}
        avatares={Object.fromEntries(avataresMap)}
        nomesPorEmail={nomesPorEmail}
        casos={casos}
      />
    </div>
  );
}
