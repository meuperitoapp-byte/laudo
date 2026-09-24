import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ModuloSistema } from "@/types/enums";

// Tipo genérico (não o `Awaited<ReturnType<typeof createClient>>` de
// server.ts) de propósito — esta função também é chamada de dentro do
// middleware (src/lib/supabase/middleware.ts), que monta seu próprio
// cliente via `createServerClient` direto, sem passar pelo wrapper de
// server.ts (o middleware não tem acesso a `cookies()` de next/headers do
// mesmo jeito). Ambos os clientes satisfazem este tipo.
type SupabaseServer = SupabaseClient<Database>;

/**
 * Resultado da consulta de acesso do usuário logado.
 *
 * `tipo: "admin"` = e-mail sem linha em `perfil_usuarios` (regra
 * "grandfather", ver migration 20260930170000) — acesso total a TODOS os
 * módulos, inclusive o próprio painel de administração de perfis. É o
 * estado de qualquer usuário criado antes desta feature existir (Dra.
 * Fernanda e secretária) até que ela explicitamente atribua um perfil.
 *
 * `tipo: "restrito"` = e-mail vinculado a um perfil — só enxerga
 * `modulosPermitidos`, e NUNCA o painel de administração (mesmo que
 * "configuracoes" esteja liberado pro perfil dele — ver comentário em
 * `podeAdministrarAcessos`).
 */
export type ContextoAcesso =
  | { tipo: "admin" }
  | { tipo: "restrito"; perfilId: string; perfilNome: string; nomeExibicao: string; modulosPermitidos: ModuloSistema[] };

/**
 * Busca o contexto de acesso do e-mail logado. Chamada pelo layout do
 * dashboard (pra montar o menu) e por cada página protegida (pra bloquear
 * acesso direto por URL, não só esconder o link do menu).
 */
export async function obterContextoAcesso(supabase: SupabaseServer, email: string): Promise<ContextoAcesso> {
  const { data: vinculo, error: erroVinculo } = await supabase
    .from("perfil_usuarios")
    .select("perfil_id, nome_exibicao")
    .eq("email", email)
    .maybeSingle();
  // Falha de consulta aqui vira "admin" (acesso total), não "bloqueia tudo"
  // — o inverso do que pareceria mais seguro à primeira vista. Motivo: esta
  // checagem roda no middleware, em TODA navegação de TODO mundo (inclusive
  // a Dra. Fernanda); se o Supabase engasgar por um instante e a resposta
  // fosse "bloqueia tudo", o sistema inteiro ficaria inacessível pra ela
  // também. O risco oposto (alguém restrito ganhar acesso total por alguns
  // segundos numa falha rara) é bem menor que travar o sistema inteiro pra
  // todo mundo por causa de uma instabilidade passageira.
  if (erroVinculo) {
    console.error(`Acessos: falha ao buscar vínculo de perfil para ${email}:`, erroVinculo.message);
    return { tipo: "admin" };
  }
  if (!vinculo) return { tipo: "admin" };

  const [{ data: perfil, error: erroPerfil }, { data: permissoes, error: erroPermissoes }] = await Promise.all([
    supabase.from("perfis").select("nome").eq("id", vinculo.perfil_id).maybeSingle(),
    supabase.from("perfil_permissoes").select("modulo").eq("perfil_id", vinculo.perfil_id),
  ]);
  if (erroPerfil) console.error(`Acessos: falha ao buscar perfil ${vinculo.perfil_id}:`, erroPerfil.message);
  if (erroPermissoes) {
    console.error(`Acessos: falha ao buscar permissões do perfil ${vinculo.perfil_id}:`, erroPermissoes.message);
  }

  return {
    tipo: "restrito",
    perfilId: vinculo.perfil_id,
    perfilNome: perfil?.nome ?? "",
    nomeExibicao: vinculo.nome_exibicao,
    modulosPermitidos: (permissoes ?? []).map((p) => p.modulo),
  };
}

/**
 * Só `tipo: "admin"` administra perfis — mesmo que um perfil restrito tenha
 * o módulo "configuracoes" liberado, ele NUNCA vê o painel de perfis
 * (senão poderia se auto-conceder mais acesso, ou conceder a outros —
 * escalação de privilégio). "Configurações" liberado dá acesso só ao resto
 * da tela (identidade visual, dados de contato), não a esta sub-rota.
 */
export function podeAdministrarAcessos(contexto: ContextoAcesso): boolean {
  return contexto.tipo === "admin";
}

/** Um módulo específico está liberado pro usuário logado? Admin sempre pode tudo. */
export function temAcessoAoModulo(contexto: ContextoAcesso, modulo: ModuloSistema): boolean {
  return contexto.tipo === "admin" || contexto.modulosPermitidos.includes(modulo);
}
