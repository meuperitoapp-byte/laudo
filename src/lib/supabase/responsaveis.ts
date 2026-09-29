import { createClient } from "@/lib/supabase/server";

/**
 * A Dra. Fernanda é a conta ORIGINAL do sistema — nunca passou pelo fluxo de
 * "convidar usuário" (Perfis de Acesso), então nunca ganhou uma linha em
 * `perfil_usuarios` (regra grandfather: sem linha = acesso total). Bug real
 * relatado por ela (25/09/2026, print da Patrícia): o dropdown de
 * "Responsável" ficava sem o próprio nome dela por causa disso — quem
 * apresenta a Estratégia Pericial na maioria dos casos é ela mesma. Fixo
 * aqui, não uma linha de `perfil_usuarios` (evita ela cair sob um perfil
 * restrito por engano se alguém editar essa tabela depois).
 */
const NOME_ADMIN_ORIGINAL = "Dra. Fernanda";

/**
 * Lista os nomes de exibição dos logins já criados (perfil_usuarios) — usado
 * em todo campo "Responsável" do sistema (pedido da Dra. Fernanda, 24/09/2026:
 * "todos os itens que tiver responsável devem aparecer os nomes dos logins
 * criados"), substituindo campos de texto livre por um <select>. Sempre
 * inclui a admin original (ver `NOME_ADMIN_ORIGINAL`) mesmo sem linha em
 * `perfil_usuarios`.
 */
export async function listarNomesResponsaveis(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfil_usuarios")
    .select("nome_exibicao")
    .order("nome_exibicao", { ascending: true });
  const nomes = error || !data ? [] : data.map((r) => r.nome_exibicao);
  return Array.from(new Set([NOME_ADMIN_ORIGINAL, ...nomes])).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Nome de exibição de quem está logado agora (pela saudação do Dashboard, 25/09/2026) — mesmo fallback de `listarNomesResponsaveis` pra quem não tem linha em `perfil_usuarios`. */
export async function nomeExibicaoDoEmail(email: string | null | undefined): Promise<string> {
  if (!email) return NOME_ADMIN_ORIGINAL;
  const supabase = await createClient();
  const { data } = await supabase.from("perfil_usuarios").select("nome_exibicao").eq("email", email).maybeSingle();
  return data?.nome_exibicao || NOME_ADMIN_ORIGINAL;
}

/**
 * Mapa email -> nome de exibição, pra listas com várias linhas de autores
 * diferentes sem 1 consulta por linha (ex.: histórico do chat). Mesmo
 * fallback de `nomeExibicaoDoEmail`. Existe pra renderizar o nome de exibição
 * ATUAL em vez de confiar num nome gravado no momento do envio — bug real
 * (30/09/2026, print dela): mensagens antigas do chat continuavam mostrando
 * "analisedeviabilidade.pericons" mesmo depois de corrigido o cálculo do
 * nome no envio, porque `chat_mensagens.autor_nome` é só uma foto do momento
 * do insert, não recalculado depois. Resolvendo por nome atual (não por
 * backfill de coluna) o problema nunca mais volta, mesmo que a regra de nome
 * mude de novo no futuro.
 */
export async function mapaNomesPorEmail(emails: string[]): Promise<Record<string, string>> {
  if (emails.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("perfil_usuarios").select("email, nome_exibicao").in("email", emails);
  const encontrados = new Map((data ?? []).map((r) => [r.email, r.nome_exibicao]));
  const mapa: Record<string, string> = {};
  for (const email of emails) mapa[email] = encontrados.get(email) ?? NOME_ADMIN_ORIGINAL;
  return mapa;
}
