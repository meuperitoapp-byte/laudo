import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirAtestado } from "./actions";
import { AtestadoPanel } from "./atestado-panel";
import { GerarAtestadoPanel, type VersaoAtestado } from "./gerar-atestado-panel";
import { TITULO_TIPO_DOCUMENTO } from "./catalogos";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";
import type { AtestadoTipoDocumento } from "@/types/enums";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

/**
 * Conteúdo compartilhado das telas /processos/[id]/atestado e
 * /processos/[id]/declaracao — mesma estrutura, só `tipoDocumento` muda (ver
 * migration 20260930210000: uma tabela só pros dois, distinguidos por essa
 * coluna).
 */
export async function AtestadoPageContent({ processoId, tipoDocumento }: { processoId: string; tipoDocumento: AtestadoTipoDocumento }) {
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, etapas_contratadas")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`${tipoDocumento}: falha ao buscar processo:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  const etapaCodigo = tipoDocumento === "declaracao" ? "declaracao" : "atestados";
  if (!(processo.etapas_contratadas?.includes(etapaCodigo) ?? false)) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">
            {TITULO_TIPO_DOCUMENTO[tipoDocumento]} não contratado
          </h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
            Esta etapa não está marcada nas etapas contratadas deste processo.
          </p>
          <Link href={`/processos/${processoId}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const atestadoResultado = await garantirAtestado(processoId, tipoDocumento);
  if ("error" in atestadoResultado) {
    console.error(`${tipoDocumento}: falha ao garantir registro:`, atestadoResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const atestado = atestadoResultado.data;

  const [{ data: documentosDb, error: erroDocumentos }, { data: versoesDb, error: erroVersoes }] = await Promise.all([
    supabase.from("documentos").select("id, nome_arquivo").eq("processo_id", processoId).order("ordem", { ascending: true }),
    supabase
      .from("laudos_gerados")
      .select("*")
      .eq("processo_id", processoId)
      .eq("tipo", tipoDocumento)
      .order("versao", { ascending: false }),
  ]);

  const erros: string[] = [];
  if (erroDocumentos) {
    console.error(`${tipoDocumento}: falha ao buscar documentos:`, erroDocumentos.message);
    erros.push("os documentos do processo");
  }
  if (erroVersoes) {
    console.error(`${tipoDocumento}: falha ao buscar versões geradas:`, erroVersoes.message);
    erros.push("as versões já geradas");
  }

  const listaVersoes = versoesDb ?? [];
  const caminhos = listaVersoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas, error: erroAssinadas } = await supabase.storage.from(BUCKET_LAUDOS_GERADOS).createSignedUrls(caminhos, VALIDADE_URL_SEGUNDOS);
    if (erroAssinadas) {
      console.error(`${tipoDocumento}: falha ao gerar links de download:`, erroAssinadas.message);
      erros.push("os links de download das versões geradas");
    }
    if (assinadas) urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
  }
  const versoes: VersaoAtestado[] = listaVersoes.map((v) => ({
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
      </div>

      {erros.length > 0 && (
        <BannerErroConsulta mensagem={`Não foi possível carregar ${erros.join(", ")}. A tela continua funcionando, mas alguns dados podem estar incompletos.`} />
      )}

      <AtestadoPanel
        atestado={atestado}
        periciandoNome={processo.periciando_nome || "o(a) periciando(a)"}
        documentosDisponiveis={(documentosDb ?? []).map((d) => ({ id: d.id, nomeArquivo: d.nome_arquivo }))}
      />

      <GerarAtestadoPanel processoId={processoId} atestadoId={atestado.id} tipoDocumento={tipoDocumento} versoes={versoes} />
    </main>
  );
}
