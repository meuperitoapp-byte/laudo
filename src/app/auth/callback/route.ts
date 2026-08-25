import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link mágico enviado por e-mail (ver src/features/auth/actions.ts
 * `emailRedirectTo`). O Supabase redireciona pra cá com `?code=...` (fluxo
 * PKCE, usado pelo @supabase/ssr) — trocamos o code pela sessão (grava nos
 * cookies) e mandamos o usuário pra dentro do sistema.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/processos";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
