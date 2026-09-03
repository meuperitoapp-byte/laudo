import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistroDemandaForm } from "@/features/pos-laudo/registro-demanda-form";
import { CICLO_STATUS_ROTULOS, FLUXO_ROTULOS } from "@/features/pos-laudo/rotulos";
import type { PosLaudoCicloStatus, PosLaudoFluxo } from "@/types/enums";

export default async function PosLaudoCicloPage({
  params,
}: {
  params: Promise<{ id: string; cicloId: string }>;
}) {
  const { id: processoId, cicloId } = await params;
  const supabase = await createClient();

  const { data: ciclo } = await supabase
    .from("pos_laudo_ciclos")
    .select("*")
    .eq("id", cicloId)
    .eq("processo_id", processoId)
    .single();
  if (!ciclo) {
    notFound();
  }

  const { data: documentos } = await supabase
    .from("documentos")
    .select("id, nome_arquivo")
    .eq("processo_id", processoId)
    .eq("tipo", "documento_processual")
    .order("ordem", { ascending: true });

  return (
    <main className="p-8 max-w-2xl space-y-6">
      <Link
        href={`/processos/${processoId}/pos-laudo`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para os ciclos
      </Link>

      <div className="space-y-1">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">
          Ciclo {ciclo.numero_ciclo} — pós-laudo
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          Fluxo: {FLUXO_ROTULOS[ciclo.fluxo as PosLaudoFluxo] ?? ciclo.fluxo} · Status:{" "}
          {CICLO_STATUS_ROTULOS[ciclo.status as PosLaudoCicloStatus] ?? ciclo.status}
        </p>
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600">
          O fluxo vem do tipo de trabalho do processo e não muda. As próximas etapas do ciclo
          (triagem, matriz, documentos, geração) entram nas fatias seguintes.
        </p>
      </div>

      <RegistroDemandaForm
        processoId={processoId}
        ciclo={{
          id: ciclo.id,
          data_intimacao: ciclo.data_intimacao,
          prazo: ciclo.prazo,
          origem: ciclo.origem,
          natureza: ciclo.natureza as string[] | null,
          documento_intimacao_id: ciclo.documento_intimacao_id,
        }}
        documentos={documentos ?? []}
      />
    </main>
  );
}
