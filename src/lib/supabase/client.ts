import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Client Components ("use client").
 * Usa @supabase/ssr para manter a sessão em cookies (não localStorage),
 * sincronizada com o cliente de servidor (src/lib/supabase/server.ts) e o
 * middleware (src/lib/supabase/middleware.ts).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
