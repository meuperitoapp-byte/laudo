import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_ROTULOS: Record<string, string> = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  arquivado: "Arquivado",
};

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("*")
    .eq("id", id)
    .single();

  if (!processo) {
    notFound();
  }

  let tipoLaudoNome: string | null = null;
  let primeiraSecaoId: string | null = null;
  if (processo.tipo_laudo_id) {
    const [{ data: tipoLaudo }, { data: primeiraSecao }] = await Promise.all([
      supabase.from("tipos_laudo").select("*").eq("id", processo.tipo_laudo_id).single(),
      supabase
        .from("secoes")
        .select("id")
        .eq("tipo_laudo_id", processo.tipo_laudo_id)
        .order("ordem")
        .limit(1)
        .maybeSingle(),
    ]);
    tipoLaudoNome = tipoLaudo?.nome ?? null;
    primeiraSecaoId = primeiraSecao?.id ?? null;
  }

  const titulo =
    processo.numero_processo ||
    processo.periciando_nome ||
    processo.parte_autora ||
    "Processo sem identificação";

  return (
    <main className="p-8 space-y-8 max-w-2xl">
      <div>
        <Link href="/processos" className="text-sm underline text-zinc-600 dark:text-zinc-400">
          ← Voltar para processos
        </Link>
        <h1 className="text-xl font-semibold mt-2">{titulo}</h1>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <dt className="text-zinc-500">Tipo de trabalho</dt>
        <dd>{TIPO_TRABALHO_ROTULOS[processo.tipo_trabalho] ?? processo.tipo_trabalho}</dd>

        <dt className="text-zinc-500">Tipo de laudo</dt>
        <dd>{tipoLaudoNome ?? "—"}</dd>

        <dt className="text-zinc-500">Status</dt>
        <dd>{STATUS_ROTULOS[processo.status] ?? processo.status}</dd>

        {processo.tipo_trabalho === "pericia_judicial" && (
          <>
            <dt className="text-zinc-500">Número do processo</dt>
            <dd>{processo.numero_processo ?? "—"}</dd>

            <dt className="text-zinc-500">Vara/Comarca</dt>
            <dd>
              {[processo.vara_numero, processo.comarca_subsecao, processo.uf]
                .filter(Boolean)
                .join(" — ") || "—"}
            </dd>

            <dt className="text-zinc-500">Parte autora</dt>
            <dd>{processo.parte_autora ?? "—"}</dd>

            <dt className="text-zinc-500">Parte ré</dt>
            <dd>{processo.partes_re ?? "—"}</dd>

            <dt className="text-zinc-500">Periciando(a)</dt>
            <dd>{processo.periciando_nome ?? "—"}</dd>

            <dt className="text-zinc-500">Objeto da perícia</dt>
            <dd className="col-span-2">{processo.objeto_pericia ?? "—"}</dd>
          </>
        )}

        {processo.tipo_trabalho === "assistencia_tecnica" && (
          <>
            <dt className="text-zinc-500">Etapas contratadas</dt>
            <dd>
              {processo.etapas_contratadas && processo.etapas_contratadas.length > 0
                ? processo.etapas_contratadas.join(", ")
                : "—"}
            </dd>
          </>
        )}
      </dl>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex flex-wrap gap-3 text-sm">
        {primeiraSecaoId ? (
          <Link
            href={`/processos/${processo.id}/preenchimento/${primeiraSecaoId}`}
            className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2"
          >
            Preencher laudo
          </Link>
        ) : (
          <span className="rounded border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-zinc-400">
            Preencher laudo (defina o tipo de laudo)
          </span>
        )}
        <Link
          href={`/processos/${processo.id}/quesitos`}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-4 py-2"
        >
          Quesitos
        </Link>
        <Link
          href={`/processos/${processo.id}/documentos`}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-4 py-2"
        >
          Documentos
        </Link>
        <Link
          href={`/processos/${processo.id}/laudo`}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-4 py-2"
        >
          Laudo final
        </Link>
      </div>
    </main>
  );
}
