import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesfechoTimelinePanel } from "@/features/desfecho-judicial/desfecho-timeline-panel";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function DesfechoJudicialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, numero_processo, parte_autora")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Desfecho judicial: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  const [
    { data: desfechosDb, error: erroDesfechos },
    { data: documentosDb, error: erroDocumentos },
    { data: relacionadosDb, error: erroRelacionados },
  ] = await Promise.all([
    supabase.from("desfechos_judiciais").select("*").eq("processo_id", processoId),
    supabase.from("documentos").select("*").eq("processo_id", processoId).order("ordem", { ascending: true }),
    supabase.from("desfecho_documentos_relacionados").select("id, desfecho_id, documento_id, created_at"),
  ]);
  if (erroDesfechos) console.error(`Desfecho judicial (${processoId}): falha ao buscar decisões:`, erroDesfechos.message);
  if (erroDocumentos) console.error(`Desfecho judicial (${processoId}): falha ao buscar documentos:`, erroDocumentos.message);
  if (erroRelacionados) console.error(`Desfecho judicial (${processoId}): falha ao buscar documentos relacionados:`, erroRelacionados.message);

  const documentos = documentosDb ?? [];
  const nomeDocumentoPorId = new Map(documentos.map((d) => [d.id, d.nome_arquivo]));
  const relacionadosPorDesfecho = new Map<string, typeof relacionadosDb>();
  for (const r of relacionadosDb ?? []) {
    const lista = relacionadosPorDesfecho.get(r.desfecho_id) ?? [];
    lista.push(r);
    relacionadosPorDesfecho.set(r.desfecho_id, lista);
  }
  const desfechos = (desfechosDb ?? []).map((d) => ({
    ...d,
    documentosRelacionados: (relacionadosPorDesfecho.get(d.id) ?? []).map((r) => ({ ...r, nome_arquivo: nomeDocumentoPorId.get(r.documento_id) ?? null })),
  }));

  const nomeCaso = processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/processos/${processoId}`} className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← {nomeCaso}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Desfecho Judicial</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Resultado do processo para a parte assistida — múltiplos registros em ordem cronológica, sempre sob a perspectiva de quem a PERICONS assiste.
        </p>
      </div>
      {(erroDesfechos || erroDocumentos || erroRelacionados) && <BannerErroConsulta mensagem="Não foi possível carregar todos os dados agora." />}
      <DesfechoTimelinePanel processoId={processoId} desfechos={desfechos} documentos={documentos} />
    </main>
  );
}
