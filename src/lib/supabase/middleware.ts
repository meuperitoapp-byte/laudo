import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Roda em toda requisição (ver src/middleware.ts). Duas responsabilidades:
 *  1) Renovar o token de sessão nos cookies (senão a sessão expira mesmo com
 *     o usuário ativo).
 *  2) Redirecionar quem não está logado para /login, e quem já está logado
 *     para fora de /login — a proteção real de (dashboard) acontece aqui,
 *     antes de qualquer Server Component renderizar.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: getUser() (não getSession()) — valida o token contra o
  // servidor do Supabase em vez de só ler o cookie, que pode estar forjado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";
  // /auth/callback processa o link mágico ANTES de existir sessão — não pode
  // ser barrado pelo redirect abaixo, senão a troca de código nunca acontece.
  const isAuthCallbackRoute = pathname.startsWith("/auth/callback");

  if (!user && !isLoginRoute && !isAuthCallbackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/processos";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
