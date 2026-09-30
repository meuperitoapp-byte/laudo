import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obterContextoAcesso } from "@/features/acessos/contexto";
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
import { TeseAdversaPanel } from "@/features/viabilidade/tese-adversa-panel";
import { RaciocinioPericialPanel } from "@/features/viabilidade/raciocinio-pericial-panel";
import { NecessidadeEspecialistaPanel } from "@/features/viabilidade/necessidade-especialista-panel";
import { LiteraturaPanel } from "@/features/viabilidade/literatura-panel";
import { MatrizPanel } from "@/features/viabilidade/matriz-panel";
import { ConclusaoPanel } from "@/features/viabilidade/conclusao-panel";
import { RecomendacaoPanel } from "@/features/viabilidade/recomendacao-panel";
import { ProximaAcaoPanel } from "@/features/viabilidade/proxima-acao-panel";
import { BloqueiosPanel } from "@/features/viabilidade/bloqueios-panel";
import { GerarAnaliseViabilidadePanel, type VersaoAnaliseViabilidade } from "@/features/viabilidade/gerar-analise-viabilidade-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ESPECIALIDADE_SEED, MATERIA_SEED } from "@/features/viabilidade/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { listarNomesResponsaveis } from "@/lib/supabase/responsaveis";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

/**
 * Janela de Análise de Viabilidade Técnico-Pericial — fatias 0 (cabeçalho +
 * status), 1 (finalidade + narrativas + objeto + questões técnicas), 2
 * (acervo documental + suficiência + documentos faltantes + limitações
 * documentais, §7-10), 3 (linha do tempo médico-pericial + fatos
 * comprovados + pontos técnicos/controvérsias, §11-13), 4 (condutas
 * analisadas + oportunidade diagnóstica/terapêutica + nexo causal + dano +
 * incapacidade + causas alternativas, §14-19), 5 (pontos favoráveis +
 * fragilidades + oportunidades probatórias + risco pericial, §20-23), 6
 * (tese adversa + raciocínio pericial + necessidade de especialista +
 * literatura, §24-27), 7 (matriz final + conclusão + recomendação +
 * próxima ação + bloqueios pra finalização, §28-31 e §42) e 8 (geração do
 * PDF/Word, §38 — reaproveita o motor de `geracao-laudo`, ver
 * compilar-pdf.ts). Spec completa de 45 seções em memória do projeto
 * (analise-viabilidade-spec) — módulo 100% implementado conforme o
 * recorte de escopo V1 aprovado.
 *
 * Pós-entrega e satisfação (§39, fatia 9) saiu daqui pra uma tela própria
 * (`./pos-entrega`, 30/09/2026, pedido dela: "essa parte teria que ser
 * outra janela, fica muito lá embaixo depois de tudo que analisei") — é
 * também a ÚNICA parte da Análise que Patrícia/financeiro podem ver e
 * preencher (sigilo: eles não têm acesso a nada do que é analisado aqui,
 * só aos dados essenciais do caso e ao comando da próxima ação). Por isso
 * perfil restrito nem chega a abrir ESTA página — é redirecionado direto
 * pra lá, mais abaixo.
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const contexto = session?.user.email ? await obterContextoAcesso(supabase, session.user.email) : { tipo: "admin" as const };
  // Sigilo (30/09/2026, pedido dela): Patrícia/financeiro não têm acesso a
  // NADA do que é analisado aqui — só à tela de Pós-entrega, que é onde
  // ficam os comandos e dados essenciais do caso pra eles agirem.
  if (contexto.tipo === "restrito") redirect(`/processos/${id}/viabilidade/pos-entrega`);

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

  const [analiseResultado, nexoResultado, danoResultado, incapacidadeResultado, nomesResponsaveis] = await Promise.all([
    garantirAnaliseViabilidade(id),
    garantirNexoCausal(id),
    garantirDano(id),
    garantirIncapacidade(id),
    listarNomesResponsaveis(),
  ]);
  if ("error" in analiseResultado) {
    console.error("Viabilidade: falha ao garantir análise:", analiseResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta análise" />;
  }
  if ("error" in nexoResultado) console.error("Viabilidade: falha ao garantir nexo causal:", nexoResultado.error);
  if ("error" in danoResultado) console.error("Viabilidade: falha ao garantir dano:", danoResultado.error);
  if ("error" in incapacidadeResultado) console.error("Viabilidade: falha ao garantir incapacidade:", incapacidadeResultado.error);
  const analise = analiseResultado.data;

  const erros: string[] = [];

  const { data: outrasAnalises, error: erroOutras } = await supabase
    .from("analises_viabilidade")
    .select("especialidade, materia")
    .neq("id", analise.id);
  if (erroOutras) {
    console.error("Viabilidade: falha ao buscar sugestões de catálogo:", erroOutras.message);
    erros.push("as sugestões de especialidade/matéria");
  }

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
  if (erroQuestoes) {
    console.error("Viabilidade: falha ao buscar questões técnicas:", erroQuestoes.message);
    erros.push("as questões técnicas");
  }

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
    { data: teseAdversaDb, error: erroTeseAdversa },
    { data: necessidadeEspecialistaDb, error: erroNecessidadeEspecialista },
    { data: literaturaDb, error: erroLiteratura },
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
    supabase.from("caso_tese_adversa").select("*").eq("processo_id", id),
    supabase.from("caso_necessidade_especialista").select("*").eq("processo_id", id),
    supabase.from("caso_literatura_utilizada").select("*").eq("processo_id", id),
  ]);
  if (erroDocumentos) {
    console.error("Viabilidade: falha ao buscar documentos:", erroDocumentos.message);
    erros.push("os documentos");
  }
  if (erroAvaliacoes) {
    console.error("Viabilidade: falha ao buscar avaliações de documentos:", erroAvaliacoes.message);
    erros.push("as avaliações de documentos");
  }
  if (erroFaltantes) {
    console.error("Viabilidade: falha ao buscar documentos faltantes:", erroFaltantes.message);
    erros.push("os documentos faltantes");
  }
  if (erroLinhaTempo) {
    console.error("Viabilidade: falha ao buscar linha do tempo:", erroLinhaTempo.message);
    erros.push("a linha do tempo médico-pericial");
  }
  if (erroFatos) {
    console.error("Viabilidade: falha ao buscar fatos comprovados:", erroFatos.message);
    erros.push("os fatos comprovados");
  }
  if (erroPontosTecnicos) {
    console.error("Viabilidade: falha ao buscar pontos técnicos:", erroPontosTecnicos.message);
    erros.push("os pontos técnicos/controvérsias");
  }
  if (erroCondutas) {
    console.error("Viabilidade: falha ao buscar condutas analisadas:", erroCondutas.message);
    erros.push("as condutas analisadas");
  }
  if (erroCausasAlternativas) {
    console.error("Viabilidade: falha ao buscar causas alternativas:", erroCausasAlternativas.message);
    erros.push("as causas alternativas");
  }
  if (erroPontosFavoraveis) {
    console.error("Viabilidade: falha ao buscar pontos favoráveis:", erroPontosFavoraveis.message);
    erros.push("os pontos favoráveis");
  }
  if (erroFragilidades) {
    console.error("Viabilidade: falha ao buscar fragilidades:", erroFragilidades.message);
    erros.push("as fragilidades");
  }
  if (erroOportunidadesProbatorias) {
    console.error("Viabilidade: falha ao buscar oportunidades probatórias:", erroOportunidadesProbatorias.message);
    erros.push("as oportunidades probatórias");
  }
  if (erroTeseAdversa) {
    console.error("Viabilidade: falha ao buscar tese adversa:", erroTeseAdversa.message);
    erros.push("a tese adversa");
  }
  if (erroNecessidadeEspecialista) {
    console.error("Viabilidade: falha ao buscar necessidade de especialista:", erroNecessidadeEspecialista.message);
    erros.push("a necessidade de especialista");
  }
  if (erroLiteratura) {
    console.error("Viabilidade: falha ao buscar literatura:", erroLiteratura.message);
    erros.push("a literatura utilizada");
  }

  const { data: versoesDb, error: erroVersoes } = await supabase
    .from("laudos_gerados")
    .select("*")
    .eq("processo_id", id)
    .eq("tipo", "analise_viabilidade")
    .order("versao", { ascending: false });
  if (erroVersoes) {
    console.error("Viabilidade: falha ao buscar versões geradas:", erroVersoes.message);
    erros.push("as versões já geradas");
  }

  const listaVersoes = versoesDb ?? [];
  const caminhosVersoes = listaVersoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhosVersoes.length > 0) {
    const { data: assinadas, error: erroAssinadas } = await supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .createSignedUrls(caminhosVersoes, 60 * 60);
    if (erroAssinadas) {
      console.error("Viabilidade: falha ao gerar links de download:", erroAssinadas.message);
      erros.push("os links de download das versões já geradas");
    }
    if (assinadas) urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
  }
  const versoesAnaliseViabilidade: VersaoAnaliseViabilidade[] = listaVersoes.map((v) => ({
    id: v.id,
    versao: v.versao,
    criadoEm: v.created_at,
    urlPdf: v.storage_path_pdf ? (urlPorCaminho.get(v.storage_path_pdf) ?? null) : null,
    urlDocx: v.storage_path_docx ? (urlPorCaminho.get(v.storage_path_docx) ?? null) : null,
  }));

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
        <div className="flex items-start justify-between gap-3 mt-1">
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">
            Análise de Viabilidade Técnico-Pericial
          </h1>
          <Link
            href={`/processos/${id}/viabilidade/pos-entrega`}
            className="shrink-0 text-sm text-petroleo-600 hover:underline dark:text-petroleo-400 whitespace-nowrap"
          >
            Pós-entrega e satisfação →
          </Link>
        </div>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Serviço pré-processual — sem número de processo, tribunal, vara ou comarca obrigatórios nesta fase.
        </p>
      </div>

      {erros.length > 0 && (
        <BannerErroConsulta
          mensagem={`Não foi possível carregar ${erros.join(", ")}. As seções continuam funcionando, mas alguns dados podem estar incompletos até recarregar a página.`}
        />
      )}

      <CabecalhoViabilidadePanel
        analise={analise}
        especialidadeSugestoes={especialidadeSugestoes}
        materiaSugestoes={materiaSugestoes}
      />

      <FinalidadeNarrativasPanel analise={analise} />

      <QuestoesTecnicasPanel processoId={id} questoes={questoesDb ?? []} />

      <AcervoDocumentalPanel analise={analise} documentos={documentosDb ?? []} avaliacoes={avaliacoesDb ?? []} />

      <DocumentosFaltantesPanel processoId={id} itens={faltantesDb ?? []} nomesResponsaveis={nomesResponsaveis} />

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

      <FragilidadesPanel processoId={id} itens={fragilidadesDb ?? []} nomesResponsaveis={nomesResponsaveis} />

      <OportunidadesProbatoriasPanel processoId={id} itens={oportunidadesProbatoriasDb ?? []} nomesResponsaveis={nomesResponsaveis} />

      <RiscoPericialPanel analise={analise} />

      <TeseAdversaPanel processoId={id} itens={teseAdversaDb ?? []} documentos={documentosDb ?? []} />

      <RaciocinioPericialPanel analise={analise} />

      <NecessidadeEspecialistaPanel analise={analise} itens={necessidadeEspecialistaDb ?? []} questoes={questoesDb ?? []} />

      <LiteraturaPanel processoId={id} itens={literaturaDb ?? []} documentos={documentosDb ?? []} />

      <MatrizPanel analise={analise} />

      <ConclusaoPanel analise={analise} />

      <RecomendacaoPanel analise={analise} />

      <ProximaAcaoPanel analise={analise} nomesResponsaveis={nomesResponsaveis} />

      <BloqueiosPanel
        analise={analise}
        temQuestoesTecnicas={(questoesDb ?? []).length > 0}
        temDocumentosAvaliados={(avaliacoesDb ?? []).length > 0}
      />

      <GerarAnaliseViabilidadePanel processoId={id} versoes={versoesAnaliseViabilidade} />
    </main>
  );
}
