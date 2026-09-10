/**
 * Carrega o contexto comum às duas saídas do fluxo Assistência Técnica
 * (parecer e o documento isolado de Quesitos Suplementares) — fatia 10c. Não é
 * "use server": helper de leitura puro, chamado pelos `compilar-*-at.ts`.
 *
 * Mesmo espírito de `consultas.ts` (judicial): centraliza consultas repetidas
 * pra não duplicar 5 queries iguais em dois compiladores.
 */

import type { createClient } from "@/lib/supabase/server";
import type { PendenciaGeracaoPosLaudo } from "./regras";
import type {
  ConfiguracoesRow,
  PosLaudoAtAnaliseRow,
  PosLaudoCiclosRow,
  PosLaudoPontosRow,
  PosLaudoQuesitosRow,
  ProcessosRow,
} from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface LaudoAnalisadoRef {
  documentoId: string;
  nomeArquivo: string;
  apresentante: string | null;
  dataJuntada: string | null;
  paginas: string | null;
}

export interface ContextoAt {
  ciclo: PosLaudoCiclosRow;
  processo: ProcessosRow;
  /** O laudo do perito judicial anexado ao ciclo (papel = 'laudo_analisado'). Mais recente, se houver mais de um. */
  laudoAnalisado: LaudoAnalisadoRef | null;
  pontos: PosLaudoPontosRow[];
  quesitos: PosLaudoQuesitosRow[];
  atAnalise: PosLaudoAtAnaliseRow | null;
  config: ConfiguracoesRow | null;
}

export async function carregarContextoAt(
  supabase: SupabaseServer,
  processoId: string,
  cicloId: string,
): Promise<{ erro: string } | { ok: true; ctx: ContextoAt }> {
  const { data: ciclo } = await supabase
    .from("pos_laudo_ciclos")
    .select("*")
    .eq("id", cicloId)
    .eq("processo_id", processoId)
    .maybeSingle();
  if (!ciclo) return { erro: "Ciclo de pós-laudo não encontrado." };
  if (ciclo.fluxo !== "assistencia_tecnica") {
    return { erro: "Este documento só está disponível no fluxo de Assistência Técnica." };
  }

  const [{ data: processo }, { data: pldDb }, { data: pontosDb }, { data: quesitosDb }, { data: atAnalise }, { data: config }] =
    await Promise.all([
      supabase.from("processos").select("*").eq("id", processoId).single(),
      supabase
        .from("pos_laudo_documentos")
        .select("*")
        .eq("ciclo_id", cicloId)
        .eq("papel", "laudo_analisado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("pos_laudo_pontos").select("*").eq("ciclo_id", cicloId).order("ordem"),
      supabase.from("pos_laudo_quesitos").select("*").eq("ciclo_id", cicloId).order("numero"),
      supabase.from("pos_laudo_at_analise").select("*").eq("ciclo_id", cicloId).maybeSingle(),
      supabase.from("configuracoes").select("*").maybeSingle(),
    ]);
  if (!processo) return { erro: "Processo não encontrado." };

  let laudoAnalisado: LaudoAnalisadoRef | null = null;
  if (pldDb) {
    const { data: doc } = await supabase
      .from("documentos")
      .select("nome_arquivo")
      .eq("id", pldDb.documento_id)
      .maybeSingle();
    laudoAnalisado = {
      documentoId: pldDb.documento_id,
      nomeArquivo: doc?.nome_arquivo ?? "(documento removido)",
      apresentante: pldDb.apresentante,
      dataJuntada: pldDb.data_juntada,
      paginas: pldDb.paginas,
    };
  }

  return {
    ok: true,
    ctx: {
      ciclo,
      processo,
      laudoAnalisado,
      pontos: pontosDb ?? [],
      quesitos: quesitosDb ?? [],
      atAnalise: atAnalise ?? null,
      config: config ?? null,
    },
  };
}

/**
 * Pendências comuns às duas saídas AT — cada compilador acrescenta as suas
 * (ex.: providência recomendada só bloqueia o parecer, não os quesitos
 * isolados). `tom` sempre "bloqueio": no fluxo AT não há caminho de
 * reroteamento como na Retificação judicial.
 */
export function pendenciasComunsAt(ctx: ContextoAt): PendenciaGeracaoPosLaudo[] {
  const pendencias: PendenciaGeracaoPosLaudo[] = [];

  if (!ctx.ciclo.classificacao_global) {
    pendencias.push({
      id: "sem-classificacao-global",
      label: "Classificação global do laudo ainda não preenchida.",
      href: "#classificacao-global-campo",
    });
  }
  if (!ctx.laudoAnalisado) {
    pendencias.push({
      id: "sem-laudo-analisado",
      label: "Nenhum laudo do perito judicial anexado (seção Documentos, papel “Laudo analisado”).",
      href: "#form-doc-superveniente",
    });
  }
  ctx.pontos.forEach((ponto, i) => {
    if (!ponto.resposta_tecnica?.trim()) {
      pendencias.push({
        id: `ponto-sem-resposta-${ponto.id}`,
        label: `Ponto ${i + 1} da matriz — resposta técnica ainda não preenchida.`,
        href: `#ponto-${ponto.id}`,
      });
    }
  });
  ctx.quesitos.forEach((q, i) => {
    if (!q.pergunta?.trim()) {
      pendencias.push({
        id: `quesito-sem-pergunta-${q.id}`,
        label: `Quesito ${i + 1} do ciclo — pergunta ainda não preenchida.`,
        href: `#quesito-${q.id}`,
      });
    }
  });

  return pendencias;
}
