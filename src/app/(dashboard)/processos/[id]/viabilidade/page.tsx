import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirAnaliseViabilidade, garantirNexoCausal, garantirDano, garantirIncapacidade } from "@/features/viabilidade/actions";
import { CabecalhoViabilidadePanel } from "@/features/viabilidade/cabecalho-panel";
import { FinalidadeNarrativasPanel } from "@/features/viabilidade/finalidade-narrativas-panel";
import { QuestoesTecnicasPanel } from "@/features/viabilidade/questoes-tecnicas-panel";
import { AcervoDocumentalPanel } from "@/features/viabilidade/acervo-documental-panel";
import { DocumentosFaltantesPanel } from "@/features/viabilidade/documentos-faltantes-panel";
import { LimitacoesDocumentaisPanel } from "@/features/viabilidade/limitacoes-documentais-panel";
import { LinhaTempoPanel } from "@/features/viabilidade/linha-tempo-panel";
import { FatosComprovadosPanel } from "@/features/viabilidade/fatos-comprovados-panel";
import { PontosTecnicosPanel } from "@/features/viabilidade/pontos-tecnicos-panel";
import { CondutasAnalisadasPanel } from "@/features/viabilidade/condutas-analisadas-panel";
import { OportunidadeDiagnosticaPanel } from "@/features/viabilidade/oportunidade-diagnostica-panel";
import { NexoCausalPanel } from "@/features/viabilidade/nexo-causal-panel";
import { DanoPanel } from "@/features/viabilidade/dano-panel";
import { IncapacidadePanel } from "@/features/viabilidade/incapacidade-panel";
import { CausasAlternativasPanel } from "@/features/viabilidade/causas-alternativas-panel";
import { PontosFavoraveisPanel } from "@/features/viabilidade/pontos-favoraveis-panel";
import { FragilidadesPanel } from "@/features/viabilidade/fragilidades-panel";
import { OportunidadesProbatoriasPanel } from "@/features/viabilidade/oportunidades-probatorias-panel";
import { RiscoPericialPanel } from "@/features/viabilidade/risco-pericial-panel";
import { ESPECIALIDADE_SEED, MATERIA_SEED } from "@/features/viabilidade/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

/**
 * Janela de Análise de Viabilidade Técnico-Pericial — fatias 0 (cabeçalho +
 * status), 1 (finalidade + narrativas + objeto + questões técnicas), 2
 * (acervo documental + suficiência + documentos faltantes + limitações
 * documentais, §7-10), 3 (linha do tempo médico-pericial + fatos
 * comprovados + pontos técnicos/controvérsias, §11-13) e 4 (condutas
 * analisadas + oportunidade diagnóstica/terapêutica + nexo causal + dano +
 * incapacidade + causas alternativas, §14-19). Spec completa de 45 seções
 * em memória do projeto (analise-viabilidade-spec). As fatias 5-9
 * seguintes chegam em commits futuros, contra o schema já aplicado.
 *
 * Nexo/Dano/Incapacidade são 1:1 por processo — garantidos (select-ou-
 * cria) igual à análise, cada um com seu próprio bloco condicional na UI
 * (aplicável/existe/pertinente) — nunca calculam/presumem nada sozinhos.
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

  const [analiseResultado, nexoResultado, danoResultado, incapacidadeResultado] = await Promise.all([
    garantirAnaliseViabilidade(id),
    garantirNexoCausal(id),
    garantirDano(id),
    garantirIncapacidade(id),
  ]);
  if ("error" in analiseResultado) {
    console.error("Viabilidade: falha ao garantir análise:", analiseResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta análise" />;
  }
  if ("error" in nexoResultado) console.error("Viabilidade: falha ao garantir nexo causal:", nexoResultado.error);
  if ("error" in danoResultado) console.error("Viabilidade: falha ao garantir dano:", danoResultado.error);
  if ("error" in incapacidadeResultado) console.error("Viabilidade: falha ao garantir incapacidade:", incapacidadeResultado.error);
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

  const [
    { data: documentosDb, error: erroDocumentos },
    { data: avaliacoesDb, error: erroAvaliacoes },
    { data: faltantesDb, error: erroFaltantes },
    { data: linhaTempoDb, error: erroLinhaTempo },
    { data: fatosDb, error: erroFatos },
    { data: pontosTecnicosDb, error: erroPontosTecnicos },
    { data: condutasDb, error: erroCondutas },
    { data: causasAlternativasDb, error: erroCausasAlternativas },
    { data: pontosFavoraveisDb, error: erroPontosFavoraveis },
    { data: fragilidadesDb, error: erroFragilidades },
    { data: oportunidadesProbatoriasDb, error: erroOportunidadesProbatorias },
  ] = await Promise.all([
    supabase.from("documentos").select("*").eq("processo_id", id).order("ordem", { ascending: true }),
    supabase.from("caso_documentos_avaliados").select("*").eq("processo_id", id),
    supabase.from("caso_documentos_faltantes").select("*").eq("processo_id", id),
    supabase.from("caso_linha_tempo_medica").select("*").eq("processo_id", id),
    supabase.from("caso_fatos_comprovados").select("*").eq("processo_id", id),
    supabase.from("caso_pontos_tecnicos").select("*").eq("processo_id", id),
    supabase.from("caso_condutas_analisadas").select("*").eq("processo_id", id),
    supabase.from("caso_causas_alternativas").select("*").eq("processo_id", id),
    supabase.from("caso_pontos_favoraveis").select("*").eq("processo_id", id),
    supabase.from("caso_fragilidades").select("*").eq("processo_id", id),
    supabase.from("caso_oportunidades_probatorias").select("*").eq("processo_id", id),
  ]);
  if (erroDocumentos) console.error("Viabilidade: falha ao buscar documentos:", erroDocumentos.message);
  if (erroAvaliacoes) console.error("Viabilidade: falha ao buscar avaliações de documentos:", erroAvaliacoes.message);
  if (erroFaltantes) console.error("Viabilidade: falha ao buscar documentos faltantes:", erroFaltantes.message);
  if (erroLinhaTempo) console.error("Viabilidade: falha ao buscar linha do tempo:", erroLinhaTempo.message);
  if (erroFatos) console.error("Viabilidade: falha ao buscar fatos comprovados:", erroFatos.message);
  if (erroPontosTecnicos) console.error("Viabilidade: falha ao buscar pontos técnicos:", erroPontosTecnicos.message);
  if (erroCondutas) console.error("Viabilidade: falha ao buscar condutas analisadas:", erroCondutas.message);
  if (erroCausasAlternativas) console.error("Viabilidade: falha ao buscar causas alternativas:", erroCausasAlternativas.message);
  if (erroPontosFavoraveis) console.error("Viabilidade: falha ao buscar pontos favoráveis:", erroPontosFavoraveis.message);
  if (erroFragilidades) console.error("Viabilidade: falha ao buscar fragilidades:", erroFragilidades.message);
  if (erroOportunidadesProbatorias)
    console.error("Viabilidade: falha ao buscar oportunidades probatórias:", erroOportunidadesProbatorias.message);

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

      <AcervoDocumentalPanel analise={analise} documentos={documentosDb ?? []} avaliacoes={avaliacoesDb ?? []} />

      <DocumentosFaltantesPanel processoId={id} itens={faltantesDb ?? []} />

      <LimitacoesDocumentaisPanel analise={analise} />

      <LinhaTempoPanel processoId={id} itens={linhaTempoDb ?? []} documentos={documentosDb ?? []} />

      <FatosComprovadosPanel processoId={id} itens={fatosDb ?? []} documentos={documentosDb ?? []} questoes={questoesDb ?? []} />

      <PontosTecnicosPanel processoId={id} itens={pontosTecnicosDb ?? []} />

      <CondutasAnalisadasPanel processoId={id} itens={condutasDb ?? []} />

      <OportunidadeDiagnosticaPanel analise={analise} />

      {"data" in nexoResultado && <NexoCausalPanel nexo={nexoResultado.data} processoId={id} />}

      {"data" in danoResultado && <DanoPanel dano={danoResultado.data} processoId={id} />}

      {"data" in incapacidadeResultado && <IncapacidadePanel incapacidade={incapacidadeResultado.data} processoId={id} />}

      <CausasAlternativasPanel processoId={id} itens={causasAlternativasDb ?? []} documentos={documentosDb ?? []} />

      <PontosFavoraveisPanel
        processoId={id}
        itens={pontosFavoraveisDb ?? []}
        documentos={documentosDb ?? []}
        questoes={questoesDb ?? []}
      />

      <FragilidadesPanel processoId={id} itens={fragilidadesDb ?? []} />

      <OportunidadesProbatoriasPanel processoId={id} itens={oportunidadesProbatoriasDb ?? []} />

      <RiscoPericialPanel analise={analise} />

      <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-5 py-4 text-sm text-nevoa-500 dark:text-nevoa-400">
        Próximas seções (tese adversa, raciocínio pericial, necessidade de especialista, literatura, matriz,
        conclusão, recomendação, PDF etc.) chegam nas próximas fatias — o resto do schema já está pronto, sem
        migration nova.
      </div>
    </main>
  );
}
