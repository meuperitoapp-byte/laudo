import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentosPanel, type DocumentoComUrl } from "@/features/documentos/documentos-panel";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60; // 1 hora — a página gera de novo a cada carregamento

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora, numero_processo")
    .eq("id", processoId)
    .single();

  // PGRST116 = não achou a linha (não existe de verdade). Qualquer outro
  // erro é falha de leitura e não pode virar um 404 — ver processos/[id]/page.tsx.
  if (erroProcesso && erroProcesso.code !== "PGRST116") {
    console.error(`Documentos do processo ${processoId}: falha ao buscar processo:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar os documentos agora" />;
  }
  if (!processo) {
    notFound();
  }

  const erros: string[] = [];

  const { data: documentos, error: erroDocumentos } = await supabase
    .from("documentos")
    .select("*")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });
  if (erroDocumentos) {
    console.error(`Documentos do processo ${processoId}: falha ao listar:`, erroDocumentos.message);
    erros.push("a lista de documentos");
  }

  const lista = documentos ?? [];

  // Marca quais documentos são do Módulo Pós-Laudo (supervenientes / laudo
  // analisado / manifestação analisada) — a rastreabilidade tem que aparecer
  // aqui também, não só dentro da tela do ciclo.
  const { data: ciclosDb, error: erroCiclos } = await supabase
    .from("pos_laudo_ciclos")
    .select("id, numero_ciclo")
    .eq("processo_id", processoId);
  if (erroCiclos) {
    console.error(`Documentos do processo ${processoId}: falha ao buscar ciclos de pós-laudo:`, erroCiclos.message);
    erros.push("a marcação de documentos do Pós-laudo");
  }
  const numeroPorCiclo = new Map((ciclosDb ?? []).map((c) => [c.id, c.numero_ciclo]));
  const posLaudoPorDocumento = new Map<string, { papel: string; numeroCiclo: number }>();
  if (numeroPorCiclo.size > 0) {
    const { data: pld, error: erroPld } = await supabase
      .from("pos_laudo_documentos")
      .select("documento_id, papel, ciclo_id")
      .in("ciclo_id", [...numeroPorCiclo.keys()]);
    if (erroPld) {
      console.error(`Documentos do processo ${processoId}: falha ao buscar papéis do pós-laudo:`, erroPld.message);
      erros.push("a marcação de documentos do Pós-laudo");
    }
    for (const p of pld ?? []) {
      posLaudoPorDocumento.set(p.documento_id, {
        papel: p.papel,
        numeroCiclo: numeroPorCiclo.get(p.ciclo_id) ?? 0,
      });
    }
  }

  let urlsAssinadas = new Map<string, string | null>();
  if (lista.length > 0) {
    const { data: assinadas, error: erroAssinadas } = await supabase.storage
      .from(BUCKET_DOCUMENTOS)
      .createSignedUrls(
        lista.map((d) => d.storage_path),
        URL_ASSINADA_VALIDADE_SEGUNDOS
      );
    if (erroAssinadas) {
      console.error(`Documentos do processo ${processoId}: falha ao gerar links assinados:`, erroAssinadas.message);
      erros.push("os links de download dos documentos");
    }
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
    <main className="p-8 max-w-[1600px] mx-auto">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Documentos</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">{titulo}</p>

      {erros.length > 0 && (
        <div className="mb-6">
          <BannerErroConsulta mensagem={`Não consegui carregar agora: ${erros.join(", ")}.`} />
        </div>
      )}

      <DocumentosPanel processoId={processoId} documentos={documentosComUrl} />
    </main>
  );
}
