import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentosPanel, type DocumentoComUrl } from "@/features/documentos/documentos-panel";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60; // 1 hora — a página gera de novo a cada carregamento

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora, numero_processo")
    .eq("id", processoId)
    .single();

  if (!processo) {
    notFound();
  }

  const { data: documentos } = await supabase
    .from("documentos")
    .select("*")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });

  const lista = documentos ?? [];

  // Marca quais documentos são do Módulo Pós-Laudo (supervenientes / laudo
  // analisado / manifestação analisada) — a rastreabilidade tem que aparecer
  // aqui também, não só dentro da tela do ciclo.
  const { data: ciclosDb } = await supabase
    .from("pos_laudo_ciclos")
    .select("id, numero_ciclo")
    .eq("processo_id", processoId);
  const numeroPorCiclo = new Map((ciclosDb ?? []).map((c) => [c.id, c.numero_ciclo]));
  const posLaudoPorDocumento = new Map<string, { papel: string; numeroCiclo: number }>();
  if (numeroPorCiclo.size > 0) {
    const { data: pld } = await supabase
      .from("pos_laudo_documentos")
      .select("documento_id, papel, ciclo_id")
      .in("ciclo_id", [...numeroPorCiclo.keys()]);
    for (const p of pld ?? []) {
      posLaudoPorDocumento.set(p.documento_id, {
        papel: p.papel,
        numeroCiclo: numeroPorCiclo.get(p.ciclo_id) ?? 0,
      });
    }
  }

  let urlsAssinadas = new Map<string, string | null>();
  if (lista.length > 0) {
    const { data: assinadas } = await supabase.storage
      .from(BUCKET_DOCUMENTOS)
      .createSignedUrls(
        lista.map((d) => d.storage_path),
        URL_ASSINADA_VALIDADE_SEGUNDOS
      );
    if (assinadas) {
      urlsAssinadas = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
    }
  }

  const documentosComUrl: DocumentoComUrl[] = lista.map((d) => ({
    ...d,
    signedUrl: urlsAssinadas.get(d.storage_path) ?? null,
    posLaudo: posLaudoPorDocumento.get(d.id) ?? null,
  }));

  const titulo =
    processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Documentos</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">{titulo}</p>

      <DocumentosPanel processoId={processoId} documentos={documentosComUrl} />
    </main>
  );
}
