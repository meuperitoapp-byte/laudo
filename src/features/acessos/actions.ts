"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterContextoAcesso, podeAdministrarAcessos } from "./contexto";
import type { ModuloSistema } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/**
 * Cada action abaixo é seu próprio endpoint (Server Action do Next.js) — a
 * página que esconde o link/formulário de quem não é admin NÃO protege
 * contra alguém chamar a action direto. Por isso cada uma checa de novo,
 * aqui, se o e-mail logado é admin (ver `podeAdministrarAcessos` — só quem
 * está SEM linha em `perfil_usuarios` pode mexer em perfis, nunca um perfil
 * restrito, mesmo com "configuracoes" liberado).
 */
async function exigirAdmin(): Promise<
  { supabase: Awaited<ReturnType<typeof createClient>>; email: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida — recarregue a página e faça login de novo." };
  const contexto = await obterContextoAcesso(supabase, user.email);
  if (!podeAdministrarAcessos(contexto)) {
    return { error: "Você não tem permissão para administrar perfis de acesso." };
  }
  return { supabase, email: user.email };
}

export async function criarPerfil(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const nome = textoOuNull(formData.get("nome"));
  if (!nome) return { error: "Dê um nome ao perfil." };

  const { error } = await guard.supabase.from("perfis").insert({ nome });
  if (error) return { error: error.message };

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}

export async function renomearPerfil(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const perfilId = textoOuNull(formData.get("perfil_id"));
  const nome = textoOuNull(formData.get("nome"));
  if (!perfilId || !nome) return { error: "Perfil ou nome inválido." };

  const { error } = await guard.supabase.from("perfis").update({ nome }).eq("id", perfilId);
  if (error) return { error: error.message };

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}

/**
 * `on delete restrict` no banco (perfil_usuarios.perfil_id) já impede apagar
 * um perfil com gente vinculada — aqui só traduz o erro de FK do Postgres
 * pra uma mensagem que faz sentido pra ela, em vez do texto técnico do
 * banco.
 */
export async function excluirPerfil(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const perfilId = textoOuNull(formData.get("perfil_id"));
  if (!perfilId) return { error: "Perfil inválido." };

  const { error } = await guard.supabase.from("perfis").delete().eq("id", perfilId);
  if (error) {
    if (error.code === "23503") {
      return { error: "Esse perfil ainda tem gente vinculada — mude o perfil dessas pessoas antes de apagar." };
    }
    return { error: error.message };
  }

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}

/**
 * Substitui TODAS as permissões do perfil pela lista marcada agora — mais
 * simples de raciocinar do que diffs de checkbox individuais, e o volume é
 * baixíssimo (9 módulos no máximo por perfil).
 */
export async function salvarPermissoesPerfil(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const perfilId = textoOuNull(formData.get("perfil_id"));
  if (!perfilId) return { error: "Perfil inválido." };
  const modulos = formData.getAll("modulo") as ModuloSistema[];

  const { error: erroDelete } = await guard.supabase.from("perfil_permissoes").delete().eq("perfil_id", perfilId);
  if (erroDelete) return { error: erroDelete.message };

  if (modulos.length > 0) {
    const { error: erroInsert } = await guard.supabase
      .from("perfil_permissoes")
      .insert(modulos.map((modulo) => ({ perfil_id: perfilId, modulo })));
    if (erroInsert) return { error: erroInsert.message };
  }

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}

/**
 * Convida um e-mail (Etapa 3, Admin API) e já vincula ao perfil escolhido —
 * um só passo pra ela, como pedido ("digita o e-mail e o sistema
 * convida"). Se o e-mail já existir como usuário (ex.: alguém que o
 * Jeferson cadastrou manualmente antes desta etapa existir, ou já
 * convidado antes), `inviteUserByEmail` retorna erro "already been
 * registered" — tratado como sucesso aqui, porque o objetivo (esse e-mail
 * consegue logar E fica vinculado ao perfil) já está satisfeito, só não
 * manda e-mail de novo. Upsert por e-mail: atribuir a mesma pessoa a outro
 * perfil substitui o vínculo anterior.
 */
export async function convidarUsuario(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const perfilId = textoOuNull(formData.get("perfil_id"));
  const email = textoOuNull(formData.get("email"))?.toLowerCase() ?? null;
  const nomeExibicao = textoOuNull(formData.get("nome_exibicao"));
  if (!perfilId || !email || !nomeExibicao) return { error: "Preencha perfil, e-mail e nome de exibição." };

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      error:
        "Convite por e-mail ainda não está configurado (falta a SUPABASE_SERVICE_ROLE_KEY) — peça pro Jeferson configurar.",
    };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { error: erroConvite } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  const jaExistia = erroConvite?.message.toLowerCase().includes("already been registered");
  if (erroConvite && !jaExistia) {
    return { error: `Não consegui convidar: ${erroConvite.message}` };
  }

  const { error } = await guard.supabase
    .from("perfil_usuarios")
    .upsert({ perfil_id: perfilId, email, nome_exibicao: nomeExibicao }, { onConflict: "email" });
  if (error) return { error: error.message };

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}

/**
 * Remove o vínculo — a pessoa volta a ter ACESSO TOTAL (regra grandfather:
 * e-mail sem linha aqui = admin), não perde o login. O painel avisa isso na
 * hora de confirmar (ver acessos-panel.tsx).
 */
export async function desvincularUsuario(formData: FormData): Promise<ActionResult> {
  const guard = await exigirAdmin();
  if ("error" in guard) return guard;

  const id = textoOuNull(formData.get("id"));
  if (!id) return { error: "Vínculo inválido." };

  const { error } = await guard.supabase.from("perfil_usuarios").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/configuracoes/acessos");
  return { success: true };
}
