import { createClient } from "@/lib/supabase/server";

/**
 * Lista os nomes de exibição dos logins já criados (perfil_usuarios) — usado
 * em todo campo "Responsável" do sistema (pedido da Dra. Fernanda, 24/09/2026:
 * "todos os itens que tiver responsável devem aparecer os nomes dos logins
 * criados"), substituindo campos de texto livre por um <select>. Não inclui
 * quem nunca recebeu perfil (regra grandfather de acessos) — só quem foi
 * formalmente cadastrado com nome de exibição.
 */
export async function listarNomesResponsaveis(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfil_usuarios")
    .select("nome_exibicao")
    .order("nome_exibicao", { ascending: true });
  if (error || !data) return [];
  return Array.from(new Set(data.map((r) => r.nome_exibicao))).filter(Boolean);
}
