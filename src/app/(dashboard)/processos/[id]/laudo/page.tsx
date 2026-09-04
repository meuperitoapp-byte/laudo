import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { compilarLaudo } from "@/features/geracao-laudo/compilar";
import { GerarLaudoPanel, type VersaoLaudo } from "@/features/geracao-laudo/gerar-laudo-panel";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { ConclusaoVigenteInicial } from "@/features/pos-laudo/conclusao-vigente-inicial";
import { conclusaoVigenteAtual, extrairConclusaoDoLaudo } from "@/features/pos-laudo/consultas";
import { Selo } from "@/components/ui/badge";

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
    tipo: v.tipo,
    criadoEm: v.created_at,
    urlPdf: v.storage_path_pdf ? (urlPorCaminho.get(v.storage_path_pdf) ?? null) : null,
    urlDocx: v.storage_path_docx ? (urlPorCaminho.get(v.storage_path_docx) ?? null) : null,
    protocolado: v.protocolado,
    protocoladoEm: v.protocolado_em,
    protocoloId: v.protocolo_id,
  }));

  // Bloco "Conclusão vigente": só faz sentido depois que existe um laudo
  // protocolado — é a partir dele que os ciclos de pós-laudo medem repercussão.
  const temLaudoProtocolado = lista.some((v) => v.tipo === "laudo" && v.protocolado);
  const conclusaoVigente = temLaudoProtocolado
    ? await conclusaoVigenteAtual(supabase, processoId)
    : null;
  // Editável por aqui só enquanto for a V1 do próprio laudo (nenhum ciclo a
  // consumiu). Depois disso a conclusão vira matéria de ciclo.
  const conclusaoEditavelAqui =
    !conclusaoVigente ||
    (conclusaoVigente.origem_tipo === "laudo" && conclusaoVigente.ciclo_id === null);
  const extraida =
    temLaudoProtocolado && !conclusaoVigente
      ? await extrairConclusaoDoLaudo(supabase, processoId)
      : null;

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Laudo final</h1>

      {resultado.status === "erro" && (
        <p className="text-sm rounded-lg border border-vinho-600/30 bg-vinho-100 text-vinho-700 dark:border-vinho-400/30 dark:bg-vinho-950 dark:text-vinho-400 px-4 py-3">
          {resultado.mensagem}
        </p>
      )}

      {resultado.status === "pendente_revisao" && (
        <div className="text-sm space-y-3 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-4">
          <div className="flex items-center gap-2">
            <Selo variante="atencao">Geração bloqueada</Selo>
          </div>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            As seções abaixo têm resposta, mas nunca foram salvas explicitamente (nenhuma linha em{" "}
            <code>respostas_secao</code>). O texto narrativo delas nunca passou pelos seus olhos,
            então o sistema não decide sozinho incluí-lo no documento final.
          </p>
          <p className="text-nevoa-600 dark:text-nevoa-400">
            Abra cada uma no preenchimento e clique em &quot;Salvar seção&quot; (mesmo sem editar
            nada) pra revisar e liberar a geração:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {resultado.secoesPendentes.map((s) => (
              <li key={s.secaoId}>
                <Link
                  href={`/processos/${processoId}/preenchimento/${s.secaoId}`}
                  className="text-petroleo-700 hover:underline dark:text-petroleo-400"
                >
                  {s.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado.status === "campos_obrigatorios" && (
        <div className="text-sm space-y-3 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-4">
          <div className="flex items-center gap-2">
            <Selo variante="atencao">Geração bloqueada</Selo>
          </div>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            Há campos obrigatórios sem preenchimento em seções que entrariam no documento final.
            Preencha-os para liberar a geração:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {resultado.camposFaltando.map((c) => (
              <li key={`${c.secaoId}-${c.campoRotulo}`}>
                <Link
                  href={`/processos/${processoId}/preenchimento/${c.secaoId}`}
                  className="text-petroleo-700 hover:underline dark:text-petroleo-400"
                >
                  {c.secaoTitulo}
                </Link>{" "}
                <span className="text-nevoa-600 dark:text-nevoa-400">→ {c.campoRotulo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado.status === "ok" && (
        <>
          <GerarLaudoPanel processoId={processoId} podeGerar versoes={versoes} />
          <details className="text-xs text-nevoa-500 dark:text-nevoa-400">
            <summary className="cursor-pointer hover:text-nevoa-800 dark:hover:text-nevoa-200">
              Ver conteúdo compilado (debug)
            </summary>
            <pre className="mt-2 bg-nevoa-100 dark:bg-nevoa-900 rounded-md p-4 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(resultado.modelo, null, 2)}
            </pre>
          </details>
        </>
      )}

      {resultado.status !== "ok" && versoes.length > 0 && (
        <GerarLaudoPanel processoId={processoId} podeGerar={false} versoes={versoes} />
      )}

      {temLaudoProtocolado &&
        (conclusaoEditavelAqui ? (
          <ConclusaoVigenteInicial
            processoId={processoId}
            textoInicial={conclusaoVigente?.texto ?? extraida?.texto ?? ""}
            origemAutomatica={conclusaoVigente ? null : (extraida?.secaoTitulo ?? null)}
            confirmada={Boolean(conclusaoVigente)}
          />
        ) : (
          <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-2">
            <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
              Conclusão vigente
            </h2>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
              Definida por um ciclo de pós-laudo ({conclusaoVigente?.origem_tipo}). Não é mais
              editável por aqui — as alterações passam pelos ciclos.
            </p>
            <p className="whitespace-pre-wrap text-sm text-nevoa-700 dark:text-nevoa-300">
              {conclusaoVigente?.texto}
            </p>
          </div>
        ))}
    </main>
  );
}
