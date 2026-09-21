import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirAnaliseViabilidade } from "@/features/viabilidade/actions";
import { CabecalhoViabilidadePanel } from "@/features/viabilidade/cabecalho-panel";
import { FinalidadeNarrativasPanel } from "@/features/viabilidade/finalidade-narrativas-panel";
import { QuestoesTecnicasPanel } from "@/features/viabilidade/questoes-tecnicas-panel";
import { ESPECIALIDADE_SEED, MATERIA_SEED } from "@/features/viabilidade/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

/**
 * Janela de Análise de Viabilidade Técnico-Pericial — fatias 0 (cabeçalho +
 * status) e 1 (finalidade + narrativas + objeto + questões técnicas). Spec
 * completa de 45 seções em memória do projeto (analise-viabilidade-spec) —
 * as fatias 2-9 (acervo documental, linha do tempo, fatos comprovados,
 * condutas, nexo/dano, conclusão, PDF etc.) chegam em commits seguintes,
 * todas contra o schema já aplicado (migration 20260926120000).
 *
 * Só existe pra processos de Assistência Técnica com a etapa
 * "análise de viabilidade" contratada — mesmo padrão de gate já usado por
 * ReuniaoEstrategiaPericialPanel/AnexoEtapaAtPanel no detalhe do processo.
 */
export default async function ViabilidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, tipo_trabalho, etapas_contratadas, periciando_nome, parte_autora, advogado_escritorio")
    .eq("id", id)
    .maybeSingle();

  if (erroProcesso) {
    console.error("Viabilidade: falha ao buscar processo:", erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta análise" />;
  }
  if (!processo) notFound();

  const etapaContratada = processo.tipo_trabalho === "assistencia_tecnica" && (processo.etapas_contratadas?.includes("analise_viabilidade") ?? false);
  if (!etapaContratada) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">
            Análise de Viabilidade não contratada
          </h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
            Este processo não tem a etapa &ldquo;Análise de viabilidade&rdquo; marcada nas etapas contratadas de Assistência
            Técnica. Edite o processo pra incluir essa etapa antes de abrir esta janela.
          </p>
          <Link href={`/processos/${id}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const analiseResultado = await garantirAnaliseViabilidade(id);
  if ("error" in analiseResultado) {
    console.error("Viabilidade: falha ao garantir análise:", analiseResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta análise" />;
  }
  const analise = analiseResultado.data;

  const { data: outrasAnalises, error: erroOutras } = await supabase
    .from("analises_viabilidade")
    .select("especialidade, materia")
    .neq("id", analise.id);
  if (erroOutras) console.error("Viabilidade: falha ao buscar sugestões de catálogo:", erroOutras.message);

  const especialidadeSugestoes = mesclarSugestoes(
    ESPECIALIDADE_SEED,
    (outrasAnalises ?? []).map((a) => a.especialidade),
  );
  const materiaSugestoes = mesclarSugestoes(
    MATERIA_SEED,
    (outrasAnalises ?? []).flatMap((a) => a.materia ?? []),
  );

  const { data: questoesDb, error: erroQuestoes } = await supabase
    .from("caso_questoes_tecnicas")
    .select("*")
    .eq("processo_id", id);
  if (erroQuestoes) console.error("Viabilidade: falha ao buscar questões técnicas:", erroQuestoes.message);

  const nomeCaso = processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/processos/${id}`}
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← {nomeCaso}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-1">
          Análise de Viabilidade Técnico-Pericial
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Serviço pré-processual — sem número de processo, tribunal, vara ou comarca obrigatórios nesta fase.
        </p>
      </div>

      {erroOutras && (
        <BannerErroConsulta mensagem="Não consegui carregar sugestões de especialidade/matéria — os campos continuam funcionando, só sem sugestão." />
      )}

      <CabecalhoViabilidadePanel
        analise={analise}
        especialidadeSugestoes={especialidadeSugestoes}
        materiaSugestoes={materiaSugestoes}
      />

      <FinalidadeNarrativasPanel analise={analise} />

      <QuestoesTecnicasPanel processoId={id} questoes={questoesDb ?? []} />

      <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-5 py-4 text-sm text-nevoa-500 dark:text-nevoa-400">
        Próximas seções (acervo documental, linha do tempo, fatos comprovados, condutas, nexo, dano, conclusão, PDF
        etc.) chegam nas próximas fatias — o schema completo já está pronto pra receber tudo, sem migration nova.
      </div>
    </main>
  );
}
