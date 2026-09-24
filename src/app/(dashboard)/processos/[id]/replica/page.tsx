import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirReplica } from "@/features/replica/actions";
import { ReplicaPanel } from "@/features/replica/replica-panel";
import { gerarReplicaPdf } from "@/features/replica/gerar-pdf-actions";
import { GerarDocumentoPanel, type VersaoDocumentoGerado } from "@/components/ui/gerar-documento-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

export default async function ReplicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, etapas_contratadas")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Réplica: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  if (!(processo.etapas_contratadas?.includes("dados_replica") ?? false)) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Dados para réplica não contratado</h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">Esta etapa não está marcada nas etapas contratadas deste processo.</p>
          <Link href={`/processos/${processoId}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const replicaResultado = await garantirReplica(processoId);
  if ("error" in replicaResultado) {
    console.error(`Réplica: falha ao garantir registro (${processoId}):`, replicaResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const replica = replicaResultado.data;

  const [{ data: analise }, { data: versoesDb, error: erroVersoes }] = await Promise.all([
    supabase.from("analises_contestacao").select("id").eq("processo_id", processoId).maybeSingle(),
    supabase
      .from("laudos_gerados")
      .select("*")
      .eq("processo_id", processoId)
      .eq("tipo", "orientacao_replica")
      .order("versao", { ascending: false }),
  ]);

  let temPontosSelecionados = false;
  if (analise) {
    const { count } = await supabase
      .from("contestacao_argumentos")
      .select("id", { count: "exact", head: true })
      .eq("analise_id", analise.id)
      .eq("incluir_na_replica", true);
    temPontosSelecionados = (count ?? 0) > 0;
  }

  const erros: string[] = [];
  if (erroVersoes) {
    console.error(`Réplica: falha ao buscar versões geradas (${processoId}):`, erroVersoes.message);
    erros.push("as versões já geradas");
  }

  const listaVersoes = versoesDb ?? [];
  const caminhos = listaVersoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas, error: erroAssinadas } = await supabase.storage.from(BUCKET_LAUDOS_GERADOS).createSignedUrls(caminhos, VALIDADE_URL_SEGUNDOS);
    if (erroAssinadas) {
      console.error(`Réplica: falha ao gerar links de download (${processoId}):`, erroAssinadas.message);
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
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Orientação para Réplica</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Os pontos de atenção vêm da{" "}
          <Link href={`/processos/${processoId}/analise-contestacao`} className="text-petroleo-600 hover:underline dark:text-petroleo-400">
            Análise da Contestação
          </Link>{" "}
          — marque lá &ldquo;Incluir na Orientação para Réplica&rdquo; em cada argumento relevante.
        </p>
      </div>

      {erros.length > 0 && (
        <BannerErroConsulta mensagem={`Não foi possível carregar ${erros.join(", ")}. A tela continua funcionando, mas alguns dados podem estar incompletos.`} />
      )}

      <ReplicaPanel replica={replica} temPontosSelecionados={temPontosSelecionados} />
      <GerarDocumentoPanel gerar={gerarReplicaPdf.bind(null, processoId, replica.id)} versoes={versoes} />
    </main>
  );
}
