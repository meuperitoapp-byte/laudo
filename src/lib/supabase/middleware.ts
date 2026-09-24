import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { obterContextoAcesso, temAcessoAoModulo } from "@/features/acessos/contexto";
import { moduloDaRota, CAMINHO_DO_MODULO } from "@/features/acessos/mapa-modulos";

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
    url.pathname = "/dashboard"; // porta de entrada do sistema (decisão do Jeferson, 19/09/2026)
    return NextResponse.redirect(url);
  }

  // Bloqueio por perfil de acesso (Etapa 4, 30/09/2026) — só entra aqui pra
  // rota dentro de um módulo conhecido (moduloDaRota devolve null pra /login,
  // /auth/callback etc., que nunca são bloqueadas por perfil). Admin (sem
  // linha em perfil_usuarios) sempre passa — grandfather rule, ver
  // contexto.ts. `try/catch` de propósito: se a consulta de perfil falhar
  // (rede/Supabase fora do ar), a falha NUNCA pode travar o sistema inteiro
  // pra todo mundo (inclusive pra Dra. Fernanda) — melhor deixar passar como
  // se este bloqueio não existisse do que derrubar o acesso de quem sempre
  // teve acesso total.
  if (user?.email) {
    const modulo = moduloDaRota(pathname);
    if (modulo) {
      try {
        const contexto = await obterContextoAcesso(supabase, user.email);
        if (!temAcessoAoModulo(contexto, modulo)) {
          const url = request.nextUrl.clone();
          if (contexto.tipo === "restrito" && contexto.modulosPermitidos.length > 0) {
            url.pathname = CAMINHO_DO_MODULO[contexto.modulosPermitidos[0]];
          } else {
            url.pathname = "/sem-acesso";
          }
          return NextResponse.redirect(url);
        }
      } catch (erro) {
        console.error("Middleware: falha ao checar perfil de acesso, liberando por segurança:", erro);
      }
    }
  }

  return supabaseResponse;
}
