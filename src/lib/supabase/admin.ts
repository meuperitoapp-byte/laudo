import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase com a Service Role Key — só pra operações de
 * administração que a chave anônima não alcança (Etapa 3 do painel de
 * perfis: convidar um e-mail novo via `auth.admin.inviteUserByEmail`).
 * NUNCA importar isto num Client Component nem devolver essa chave pro
 * navegador — ela ignora RLS e todas as políticas de acesso.
 *
 * Diferente de `createClient()` (server.ts), este não lê/escreve cookies —
 * não representa uma sessão de usuário, é a chave mestra do projeto. Só é
 * chamado de dentro de Server Actions já protegidas por `exigirAdmin()`
 * (ver features/acessos/actions.ts).
 *
 * Retorna `null` se a variável de ambiente ainda não foi configurada, pra
 * quem chama decidir a mensagem de erro em vez de derrubar a build/request.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
