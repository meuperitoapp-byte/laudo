import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuesitosPanel } from "@/features/quesitos/quesitos-panel";
import { garantirQuesitosDocumento } from "@/features/quesitos-documento/actions";
import { QuesitosDocumentoPanel } from "@/features/quesitos-documento/quesitos-documento-panel";
import { gerarQuesitosDocumentoPdf } from "@/features/quesitos-documento/gerar-pdf-actions";
import { GerarDocumentoPanel, type VersaoDocumentoGerado } from "@/components/ui/gerar-documento-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { enderecamentoSugerido } from "@/features/quesitos-documento/catalogos";
import { AberturaEtapaAtPanel } from "@/features/processos/abertura-etapa-at-panel";
import { EntregaEtapaAtPanel } from "@/features/processos/entrega-etapa-at-panel";
import { AnexoEtapaAtPanel, type DocumentoEtapaAt } from "@/features/processos/anexo-etapa-at-panel";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

export default async function QuesitosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora, numero_processo, tipo_trabalho, vara_numero, comarca_subsecao, uf")
    .eq("id", processoId)
    .single();

  if (erroProcesso && erroProcesso.code !== "PGRST116") {
    console.error(`Quesitos do processo ${processoId}: falha ao buscar processo:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar os quesitos agora" />;
  }
  if (!processo) {
    notFound();
  }

  const { data: quesitos, error: erroQuesitos } = await supabase
    .from("quesitos")
    .select("*")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });
  if (erroQuesitos) {
    console.error(`Quesitos do processo ${processoId}: falha ao listar:`, erroQuesitos.message);
  }

  const documentoResultado = await garantirQuesitosDocumento(processoId);
  if ("error" in documentoResultado) {
    console.error(`Quesitos do processo ${processoId}: falha ao garantir documento:`, documentoResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const documento = documentoResultado.data;

  const { data: versoesDb, error: erroVersoes } = await supabase
    .from("laudos_gerados")
    .select("*")
    .eq("processo_id", processoId)
    .eq("tipo", "quesitos_parte")
    .order("versao", { ascending: false });
  if (erroVersoes) {
    console.error(`Quesitos do processo ${processoId}: falha ao buscar versões geradas:`, erroVersoes.message);
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

  const titulo =
    processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  // Assistência Técnica (lote 15/10/2026): a perita ELABORA os quesitos pro
  // advogado — a tela segue a ordem do trabalho dela: dados do processo e
  // arquivo do advogado → texto do documento → quesitos → gerar → entrega.
  // Perícia Judicial continua igual (lista pra responder quesitos do laudo).
  const ehAt = processo.tipo_trabalho === "assistencia_tecnica";
  let anexosAdvogado: DocumentoEtapaAt[] = [];
  let erroAnexos: string | null = null;
  if (ehAt) {
    const { data: docs, error } = await supabase
      .from("documentos")
      .select("id, nome_arquivo, storage_path")
      .eq("processo_id", processoId)
      .eq("etapa_at", "quesitos")
      .order("created_at", { ascending: true });
    if (error) {
      console.error(`Quesitos do processo ${processoId}: falha ao buscar anexos:`, error.message);
      erroAnexos = error.message;
    }
    const lista = docs ?? [];
    let urlAnexo = new Map<string, string | null>();
    if (lista.length > 0) {
      const { data: assinadas } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrls(lista.map((d) => d.storage_path), VALIDADE_URL_SEGUNDOS);
      if (assinadas) urlAnexo = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
    }
    anexosAdvogado = lista.map((d) => ({ id: d.id, nomeArquivo: d.nome_arquivo, signedUrl: urlAnexo.get(d.storage_path) ?? null }));
  }

  if (ehAt) {
    return (
      <main className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href={`/processos/${processoId}`}
            className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
          >
            ← Voltar para o processo
          </Link>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Quesitos</h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">{processo.periciando_nome || titulo}</p>
        </div>

        {(erroQuesitos || erroAnexos) && (
          <BannerErroConsulta mensagem={`Não consegui carregar agora: ${[erroQuesitos && "a lista de quesitos", erroAnexos && "os arquivos anexados"].filter(Boolean).join(", ")}.`} />
        )}

        <AberturaEtapaAtPanel
          etapa="quesitos"
          registroId={documento.id}
          processoId={processoId}
          numeroProcesso={processo.numero_processo}
          dataContratacao={documento.data_contratacao}
          prazoEntrega={documento.prazo_entrega}
        />
        <AnexoEtapaAtPanel processoId={processoId} etapa="quesitos" tituloEtapa="arquivo enviado pelo advogado" documentos={anexosAdvogado} />
        <QuesitosDocumentoPanel documento={documento} enderecamentoSugerido={enderecamentoSugerido(processo)} />

        <section className="space-y-3">
          <h2 className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100">Quesitos técnico-periciais</h2>
          <QuesitosPanel processoId={processoId} quesitos={quesitos ?? []} modoAt />
        </section>

        <GerarDocumentoPanel gerar={gerarQuesitosDocumentoPdf.bind(null, processoId, documento.id)} versoes={versoes} />
        <EntregaEtapaAtPanel
          etapa="quesitos"
          registroId={documento.id}
          processoId={processoId}
          entregueEm={documento.entregue_em}
          entregueVia={documento.entregue_via}
        />
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Quesitos</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">{titulo}</p>

      {erroQuesitos && (
        <div className="mb-6">
          <BannerErroConsulta mensagem="Não consegui carregar a lista de quesitos agora." />
        </div>
      )}

      <QuesitosPanel processoId={processoId} quesitos={quesitos ?? []} />

      <div className="mt-8 space-y-6">
        <QuesitosDocumentoPanel documento={documento} enderecamentoSugerido={enderecamentoSugerido(processo)} />
        <GerarDocumentoPanel gerar={gerarQuesitosDocumentoPdf.bind(null, processoId, documento.id)} versoes={versoes} />
      </div>
    </main>
  );
}
