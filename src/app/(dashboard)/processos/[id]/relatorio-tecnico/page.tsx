import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirRelatorioTecnico } from "@/features/relatorio-tecnico/actions";
import { RelatorioTecnicoPanel } from "@/features/relatorio-tecnico/relatorio-tecnico-panel";
import { gerarRelatorioTecnicoPdf } from "@/features/relatorio-tecnico/gerar-pdf-actions";
import { GerarDocumentoPanel, type VersaoDocumentoGerado } from "@/components/ui/gerar-documento-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

export default async function RelatorioTecnicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, etapas_contratadas")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Relatório técnico: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  if (!(processo.etapas_contratadas?.includes("relatorio_tecnico") ?? false)) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Relatório técnico não contratado</h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">Esta etapa não está marcada nas etapas contratadas deste processo.</p>
          <Link href={`/processos/${processoId}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const relatorioResultado = await garantirRelatorioTecnico(processoId);
  if ("error" in relatorioResultado) {
    console.error(`Relatório técnico: falha ao garantir registro (${processoId}):`, relatorioResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const relatorio = relatorioResultado.data;

  const [{ data: documentosDb, error: erroDocumentos }, { data: versoesDb, error: erroVersoes }] = await Promise.all([
    supabase.from("documentos").select("id, nome_arquivo").eq("processo_id", processoId).order("ordem", { ascending: true }),
    supabase
      .from("laudos_gerados")
      .select("*")
      .eq("processo_id", processoId)
      .eq("tipo", "relatorio_tecnico")
      .order("versao", { ascending: false }),
  ]);

  const erros: string[] = [];
  if (erroDocumentos) {
    console.error(`Relatório técnico: falha ao buscar documentos (${processoId}):`, erroDocumentos.message);
    erros.push("os documentos do processo");
  }
  if (erroVersoes) {
    console.error(`Relatório técnico: falha ao buscar versões geradas (${processoId}):`, erroVersoes.message);
    erros.push("as versões já geradas");
  }

  const listaVersoes = versoesDb ?? [];
  const caminhos = listaVersoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas, error: erroAssinadas } = await supabase.storage.from(BUCKET_LAUDOS_GERADOS).createSignedUrls(caminhos, VALIDADE_URL_SEGUNDOS);
    if (erroAssinadas) {
      console.error(`Relatório técnico: falha ao gerar links de download (${processoId}):`, erroAssinadas.message);
      erros.push("os links de download das versões geradas");
    }
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
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Relatório Técnico</h1>
      </div>

      {erros.length > 0 && (
        <BannerErroConsulta mensagem={`Não foi possível carregar ${erros.join(", ")}. A tela continua funcionando, mas alguns dados podem estar incompletos.`} />
      )}

      <RelatorioTecnicoPanel
        relatorio={relatorio}
        documentosDisponiveis={(documentosDb ?? []).map((d) => ({ id: d.id, nomeArquivo: d.nome_arquivo }))}
      />
      <GerarDocumentoPanel gerar={gerarRelatorioTecnicoPdf.bind(null, processoId, relatorio.id)} versoes={versoes} />
    </main>
  );
}
