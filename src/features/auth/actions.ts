"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | void;

/**
 * Envia o link de acesso por e-mail (magic link). `shouldCreateUser: false`
 * porque só existem 2 usuários (perita e secretária), criados manualmente no
 * painel do Supabase — não há cadastro público (ver CLAUDE.md).
 *
 * Usamos link clicável, não código digitado: o projeto ainda não tem SMTP
 * customizado (Resend) configurado, e sem isso o template de e-mail do
 * Supabase não é editável — não dá pra incluir {{ .Token }} no corpo. O link
 * padrão (não customizado) funciona sem nenhuma configuração extra. Se um dia
 * o Resend for conectado, dá pra voltar ao fluxo de código sem mudar nada
 * aqui além do template.
 */
export async function sendOtp(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim();
  if (!email) {
    return { error: "Informe um e-mail." };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }
}

/**
 * Login por e-mail + senha — alternativa ao link mágico (que depende de o
 * link ser aberto no MESMO navegador/dispositivo que pediu o envio, por
 * causa do fluxo PKCE; se a perita abre o e-mail no app do Gmail no celular
 * enquanto pediu o link no computador, a troca falha e ela cai de volta na
 * tela de login). Só funciona pra quem já tem senha definida no painel do
 * Supabase (Authentication → Users) — não há cadastro público, os 2 usuários
 * são criados manualmente (ver CLAUDE.md).
 */
export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim();
  const senha = formData.get("senha") as string | null;
  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  redirect("/processos");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
