import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Lê/escreve a sessão via cookies (next/headers) — é isso que
 * permite ao servidor saber quem está logado sem depender de localStorage.
 *
 * Chamar sempre com `await` — `cookies()` é assíncrono nesta versão do Next.
 *
 * Nota: `setAll` pode falhar quando chamado de dentro de um Server Component
 * (só Server Actions e Route Handlers podem alterar cookies). Isso é
 * inofensivo aqui porque o middleware (src/lib/supabase/middleware.ts) já
 * cuida de renovar a sessão a cada requisição.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component — ignorado de propósito (ver nota acima).
          }
        },
      },
    }
  );
}
