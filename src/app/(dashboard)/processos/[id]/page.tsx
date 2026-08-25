import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";

const STATUS_ROTULOS: Record<string, string> = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  arquivado: "Arquivado",
};

const STATUS_VARIANTE: Record<string, "sucesso" | "atencao" | "neutro"> = {
  em_andamento: "atencao",
  finalizado: "sucesso",
  arquivado: "neutro",
};

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

function Campo({ rotulo, children, colSpan }: { rotulo: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-500">{rotulo}</dt>
      <dd className="mt-1 text-sm text-nevoa-900 dark:text-nevoa-100">{children}</dd>
    </div>
  );
}

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
    <main className="p-8 space-y-6 max-w-2xl">
      <div>
        <Link
          href="/processos"
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar para processos
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">{titulo}</h1>
          <Selo variante={STATUS_VARIANTE[processo.status] ?? "neutro"}>
            {STATUS_ROTULOS[processo.status] ?? processo.status}
          </Selo>
        </div>
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Tipo de trabalho">{TIPO_TRABALHO_ROTULOS[processo.tipo_trabalho] ?? processo.tipo_trabalho}</Campo>
          <Campo rotulo="Tipo de laudo">{tipoLaudoNome ?? "—"}</Campo>

          {processo.tipo_trabalho === "pericia_judicial" && (
            <>
              <Campo rotulo="Número do processo">{processo.numero_processo ?? "—"}</Campo>
              <Campo rotulo="Vara/Comarca">
                {[processo.vara_numero, processo.comarca_subsecao, processo.uf].filter(Boolean).join(" — ") || "—"}
              </Campo>
              <Campo rotulo="Parte autora">{processo.parte_autora ?? "—"}</Campo>
              <Campo rotulo="Parte ré">{processo.partes_re ?? "—"}</Campo>
              <Campo rotulo="Periciando(a)">{processo.periciando_nome ?? "—"}</Campo>
              <Campo rotulo="Objeto da perícia" colSpan>
                {processo.objeto_pericia ?? "—"}
              </Campo>
            </>
          )}

          {processo.tipo_trabalho === "assistencia_tecnica" && (
            <Campo rotulo="Etapas contratadas" colSpan>
              {processo.etapas_contratadas && processo.etapas_contratadas.length > 0
                ? processo.etapas_contratadas.join(", ")
                : "—"}
            </Campo>
          )}
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        {primeiraSecaoId ? (
          <Link
            href={`/processos/${processo.id}/preenchimento/${primeiraSecaoId}`}
            className={classesBotao("primaria")}
          >
            Preencher laudo
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-md border border-nevoa-200 dark:border-nevoa-800 px-4 py-2 text-sm text-nevoa-400 dark:text-nevoa-600">
            Preencher laudo (defina o tipo de laudo)
          </span>
        )}
        <Link href={`/processos/${processo.id}/quesitos`} className={classesBotao("secundaria")}>
          Quesitos
        </Link>
        <Link href={`/processos/${processo.id}/documentos`} className={classesBotao("secundaria")}>
          Documentos
        </Link>
        <Link href={`/processos/${processo.id}/laudo`} className={classesBotao("secundaria")}>
          Laudo final
        </Link>
      </div>
    </main>
  );
}
