/**
 * Consultas de leitura do Módulo Pós-Laudo compartilhadas entre Server
 * Components (páginas) e Server Actions. NÃO é um arquivo "use server" — são
 * funções comuns que recebem o client do Supabase já criado, pra não virarem
 * server actions expostas ao cliente.
 */

import type { createClient } from "@/lib/supabase/server";
import type { PosLaudoConclusaoOrigem } from "@/types/enums";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ConclusaoVigente = {
  id: string;
  texto: string;
  origem_tipo: PosLaudoConclusaoOrigem;
  ciclo_id: string | null;
  vigente_desde: string;
};

/**
 * A conclusão vigente do processo AGORA: a linha de
 * `pos_laudo_conclusoes_vigentes` com `substituida_em IS NULL` (o índice
 * parcial único garante no máximo uma). Retorna `null` quando ainda não foi
 * semeada.
 */
export async function conclusaoVigenteAtual(
  supabase: SupabaseServer,
  processoId: string,
): Promise<ConclusaoVigente | null> {
  const { data } = await supabase
    .from("pos_laudo_conclusoes_vigentes")
    .select("id, texto, origem_tipo, ciclo_id, vigente_desde")
    .eq("processo_id", processoId)
    .is("substituida_em", null)
    .maybeSingle();
  return data ?? null;
}

/** Códigos que os seeds usam EXCLUSIVAMENTE para a seção de conclusão
 * médico-pericial narrativa. `quadro_conclusivo` e `tres_camadas_conclusao`
 * ficam de fora de propósito — são seções estruturadas de apoio, não a
 * conclusão em si. */
const CODIGOS_SECAO_CONCLUSAO = [
  "conclusao_medico_pericial",
  "conclusao",
  "conclusao_relatorio",
  "conclusao_parecer",
];

/**
 * Tentativa CONSERVADORA de extrair o texto da conclusão do laudo já
 * preenchido, só pra pré-preencher o bloco "Conclusão vigente" na tela do
 * laudo final. Os 10 tipos de laudo têm códigos e estruturas de conclusão
 * diferentes — esta função só devolve texto quando há UMA seção de conclusão
 * inequívoca COM narrativo salvo. Em qualquer ambiguidade (nenhuma, ou mais de
 * uma, seção candidata com texto) devolve `null`: a tela mostra o campo vazio
 * com instrução pra perita colar o texto — nunca traz conteúdo de outra seção
 * que "pareça" conclusão.
 */
export async function extrairConclusaoDoLaudo(
  supabase: SupabaseServer,
  processoId: string,
): Promise<{ texto: string; secaoTitulo: string } | null> {
  const { data: processo } = await supabase
    .from("processos")
    .select("tipo_laudo_id")
    .eq("id", processoId)
    .maybeSingle();
  if (!processo?.tipo_laudo_id) return null;

  const { data: secoes } = await supabase
    .from("secoes")
    .select("id, titulo, codigo")
    .eq("tipo_laudo_id", processo.tipo_laudo_id)
    .in("codigo", CODIGOS_SECAO_CONCLUSAO);
  if (!secoes || secoes.length === 0) return null;

  const { data: respostas } = await supabase
    .from("respostas_secao")
    .select("secao_id, texto_narrativo")
    .eq("processo_id", processoId)
    .in(
      "secao_id",
      secoes.map((s) => s.id),
    );

  const candidatas = secoes
    .map((s) => {
      const texto = (respostas ?? []).find((r) => r.secao_id === s.id)?.texto_narrativo?.trim();
      return texto ? { texto, secaoTitulo: s.titulo } : null;
    })
    .filter((c): c is { texto: string; secaoTitulo: string } => c !== null);

  // Só é "seguro" quando há exatamente uma seção de conclusão com narrativo.
  return candidatas.length === 1 ? candidatas[0] : null;
}
