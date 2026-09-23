import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso, podeAdministrarAcessos } from "@/features/acessos/contexto";
import { AcessosPanel } from "@/features/acessos/acessos-panel";
import { ErroConsultaPagina } from "@/components/ui/erro-consulta";
import type { ModuloSistema } from "@/types/enums";

/**
 * Painel de administração de perfis de acesso (Etapa 2, 30/09/2026) — só
 * quem tem `tipo: "admin"` (ver contexto.ts) chega até aqui. Um perfil
 * restrito com "configuracoes" liberado NUNCA vê esta sub-rota, mesmo
 * digitando a URL direto — `notFound()` aqui esconde inclusive a existência
 * da página (não é um "sem permissão", que revelaria que ela existe).
 */
export default async function AcessosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) notFound();

  const contexto = await obterContextoAcesso(supabase, user.email);
  if (!podeAdministrarAcessos(contexto)) notFound();

  const [
    { data: perfisDb, error: erroPerfis },
    { data: permissoesDb, error: erroPermissoes },
    { data: usuariosDb, error: erroUsuarios },
  ] = await Promise.all([
    supabase.from("perfis").select("id, nome").order("nome"),
    supabase.from("perfil_permissoes").select("perfil_id, modulo"),
    supabase.from("perfil_usuarios").select("id, perfil_id, email, nome_exibicao").order("email"),
  ]);
  if (erroPerfis || erroPermissoes || erroUsuarios) {
    console.error(
      "Acessos: falha ao carregar perfis/permissões/usuários:",
      erroPerfis?.message ?? erroPermissoes?.message ?? erroUsuarios?.message,
    );
    return <ErroConsultaPagina titulo="Não foi possível carregar o painel de acessos agora" />;
  }

  const permissoesPorPerfil: Record<string, ModuloSistema[]> = {};
  for (const p of permissoesDb ?? []) {
    (permissoesPorPerfil[p.perfil_id] ??= []).push(p.modulo);
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Perfis de acesso</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Controle quem enxerga o quê no sistema — só você vê esta tela.
        </p>
      </div>
      <AcessosPanel
        perfis={perfisDb ?? []}
        permissoesPorPerfil={permissoesPorPerfil}
        usuarios={(usuariosDb ?? []).map((u) => ({ id: u.id, perfilId: u.perfil_id, email: u.email, nomeExibicao: u.nome_exibicao }))}
      />
    </main>
  );
}
