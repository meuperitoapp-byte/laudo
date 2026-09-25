import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEstrategiaPericial } from "@/features/estrategia-pericial/actions";
import { EstrategiaPericialPanel } from "@/features/estrategia-pericial/estrategia-pericial-panel";
import { EixosTesePanel } from "@/features/estrategia-pericial/eixos-tese-panel";
import { PontosInvestigacaoPanel } from "@/features/estrategia-pericial/pontos-investigacao-panel";
import { FragilidadesPanel } from "@/features/estrategia-pericial/fragilidades-panel";
import { TesesAdversasPanel } from "@/features/estrategia-pericial/teses-adversas-panel";
import { DocumentosProvasPanel } from "@/features/estrategia-pericial/documentos-provas-panel";
import { PlanoAcaoPanel } from "@/features/estrategia-pericial/plano-acao-panel";
import { ResponsabilidadesPanel } from "@/features/estrategia-pericial/responsabilidades-panel";
import { LinhaTempoPanel } from "@/features/viabilidade/linha-tempo-panel";
import { gerarEstrategiaPericialPdf } from "@/features/estrategia-pericial/gerar-pdf-actions";
import { GerarDocumentoPanel, type VersaoDocumentoGerado } from "@/components/ui/gerar-documento-panel";
import { listarNomesResponsaveis } from "@/lib/supabase/responsaveis";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

export default async function EstrategiaPericialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, etapas_contratadas")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Estratégia pericial: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  if (!(processo.etapas_contratadas?.includes("estrategia_pericial") ?? false)) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Estratégia pericial não contratada</h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">Esta etapa não está marcada nas etapas contratadas deste processo.</p>
          <Link href={`/processos/${processoId}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const estrategiaResultado = await garantirEstrategiaPericial(processoId);
  if ("error" in estrategiaResultado) {
    console.error(`Estratégia pericial: falha ao garantir registro (${processoId}):`, estrategiaResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const estrategia = estrategiaResultado.data;

  const [
    { data: eixosDb, error: erroEixos },
    { data: pontosDb, error: erroPontos },
    { data: fragilidadesDb, error: erroFragilidades },
    { data: tesesDb, error: erroTeses },
    { data: documentosDb, error: erroDocumentos },
    { data: planoAcaoDb, error: erroPlanoAcao },
    { data: responsabilidadesDb, error: erroResponsabilidades },
    { data: linhaTempoDb, error: erroLinhaTempo },
    { data: documentosAnexadosDb, error: erroDocumentosAnexados },
    { data: versoesDb, error: erroVersoes },
    nomesResponsaveis,
  ] = await Promise.all([
    supabase.from("estrategia_eixos_tese").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_pontos_investigacao").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_fragilidades").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_teses_adversas").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_documentos_provas").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_plano_acao").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    supabase.from("estrategia_responsabilidades").select("*").eq("estrategia_id", estrategia.id).order("ordem", { ascending: true }),
    // Linha do tempo (§5) — mesma tabela da Análise de Viabilidade
    // (caso_linha_tempo_medica, entidade do CASO por processo_id), reutilizada
    // aqui sem redigitação (§40 do spec de Viabilidade já previa isso).
    supabase.from("caso_linha_tempo_medica").select("*").eq("processo_id", processoId).order("data", { ascending: true }),
    supabase.from("documentos").select("*").eq("processo_id", processoId).order("ordem", { ascending: true }),
    supabase.from("laudos_gerados").select("*").eq("processo_id", processoId).eq("tipo", "estrategia_pericial").order("versao", { ascending: false }),
    listarNomesResponsaveis(),
  ]);

  const erros: string[] = [];
  for (const [erro, rotulo] of [
    [erroEixos, "os eixos da tese"],
    [erroPontos, "os pontos técnicos"],
    [erroFragilidades, "as fragilidades"],
    [erroTeses, "as teses adversas"],
    [erroDocumentos, "os documentos/provas"],
    [erroPlanoAcao, "o plano de ação"],
    [erroResponsabilidades, "as responsabilidades"],
    [erroLinhaTempo, "a linha do tempo"],
    [erroDocumentosAnexados, "os documentos anexados"],
    [erroVersoes, "as versões já geradas"],
  ] as const) {
    if (erro) {
      console.error(`Estratégia pericial (${processoId}): falha ao buscar ${rotulo}:`, erro.message);
      erros.push(rotulo);
    }
  }

  const listaVersoes = versoesDb ?? [];
  const caminhos = listaVersoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas } = await supabase.storage.from(BUCKET_LAUDOS_GERADOS).createSignedUrls(caminhos, VALIDADE_URL_SEGUNDOS);
    if (assinadas) urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
  }
  const versoes: VersaoDocumentoGerado[] = listaVersoes.map((v) => ({
    id: v.id,
    versao: v.versao,
    criadoEm: v.created_at,
    urlPdf: v.storage_path_pdf ? (urlPorCaminho.get(v.storage_path_pdf) ?? null) : null,
    urlDocx: v.storage_path_docx ? (urlPorCaminho.get(v.storage_path_docx) ?? null) : null,
  }));

  const nomeCaso = processo.periciando_nome || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/processos/${processoId}`} className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← {nomeCaso}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Estratégia Pericial</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Documento de direção da prova — organiza o caso, identifica fragilidades e antecipa teses adversas. Não é um parecer técnico.
        </p>
      </div>

      {erros.length > 0 && (
        <BannerErroConsulta mensagem={`Não foi possível carregar ${erros.join(", ")}. A tela continua funcionando, mas alguns dados podem estar incompletos.`} />
      )}

      <EstrategiaPericialPanel estrategia={estrategia} nomesResponsaveis={nomesResponsaveis} />
      <EixosTesePanel estrategiaId={estrategia.id} processoId={processoId} eixos={eixosDb ?? []} />
      <LinhaTempoPanel processoId={processoId} itens={linhaTempoDb ?? []} documentos={documentosAnexadosDb ?? []} />
      <PontosInvestigacaoPanel estrategiaId={estrategia.id} processoId={processoId} pontos={pontosDb ?? []} />
      <ResponsabilidadesPanel estrategiaId={estrategia.id} processoId={processoId} itens={responsabilidadesDb ?? []} />
      <FragilidadesPanel estrategiaId={estrategia.id} processoId={processoId} fragilidades={fragilidadesDb ?? []} />
      <TesesAdversasPanel estrategiaId={estrategia.id} processoId={processoId} teses={tesesDb ?? []} />
      <DocumentosProvasPanel estrategiaId={estrategia.id} processoId={processoId} itens={documentosDb ?? []} />
      <PlanoAcaoPanel estrategiaId={estrategia.id} processoId={processoId} acoes={planoAcaoDb ?? []} nomesResponsaveis={nomesResponsaveis} />
      <GerarDocumentoPanel gerar={gerarEstrategiaPericialPdf.bind(null, processoId, estrategia.id)} versoes={versoes} />
    </main>
  );
}
