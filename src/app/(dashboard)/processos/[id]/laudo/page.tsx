import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { compilarLaudo } from "@/features/geracao-laudo/compilar";
import { GerarLaudoPanel, type VersaoLaudo } from "@/features/geracao-laudo/gerar-laudo-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60; // 1 hora — a página gera de novo a cada carregamento

export default async function LaudoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const [resultado, { data: versoesDb }] = await Promise.all([
    compilarLaudo(processoId),
    supabase.from("laudos_gerados").select("*").eq("processo_id", processoId).order("versao", { ascending: false }),
  ]);

  const lista = versoesDb ?? [];
  const caminhos = lista.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((p): p is string => Boolean(p)));

  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas } = await supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .createSignedUrls(caminhos, URL_ASSINADA_VALIDADE_SEGUNDOS);
    if (assinadas) {
      urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
    }
  }

  const versoes: VersaoLaudo[] = lista.map((v) => ({
    id: v.id,
    versao: v.versao,
    criadoEm: v.created_at,
    urlPdf: v.storage_path_pdf ? (urlPorCaminho.get(v.storage_path_pdf) ?? null) : null,
    urlDocx: v.storage_path_docx ? (urlPorCaminho.get(v.storage_path_docx) ?? null) : null,
  }));

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <Link href={`/processos/${processoId}`} className="text-sm underline text-zinc-600 dark:text-zinc-400">
        ← Voltar para o processo
      </Link>
      <h1 className="text-xl font-semibold">Laudo final</h1>

      {resultado.status === "erro" && <p className="text-sm text-red-600">{resultado.mensagem}</p>}

      {resultado.status === "pendente_revisao" && (
        <div className="text-sm space-y-2">
          <p className="text-red-600">
            Geração bloqueada — as seções abaixo têm resposta, mas nunca foram salvas
            explicitamente (nenhuma linha em <code>respostas_secao</code>). O texto narrativo
            delas nunca passou pelos seus olhos, então o sistema não decide sozinho incluí-lo no
            documento final.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Abra cada uma no preenchimento e clique em &quot;Salvar seção&quot; (mesmo sem editar
            nada) pra revisar e liberar a geração:
          </p>
          <ul className="list-disc pl-5">
            {resultado.secoesPendentes.map((s) => (
              <li key={s.secaoId}>
                <Link href={`/processos/${processoId}/preenchimento/${s.secaoId}`} className="underline">
                  {s.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado.status === "ok" && (
        <>
          <GerarLaudoPanel processoId={processoId} podeGerar versoes={versoes} />
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer">Ver conteúdo compilado (debug)</summary>
            <pre className="mt-2 bg-zinc-100 dark:bg-zinc-900 rounded p-4 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(resultado.modelo, null, 2)}
            </pre>
          </details>
        </>
      )}

      {resultado.status !== "ok" && versoes.length > 0 && (
        <GerarLaudoPanel processoId={processoId} podeGerar={false} versoes={versoes} />
      )}
    </main>
  );
}
