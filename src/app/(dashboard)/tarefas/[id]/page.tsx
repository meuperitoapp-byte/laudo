import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TarefaForm } from "@/features/central-prazos/tarefa-form";
import { TarefaAcoes } from "@/features/central-prazos/tarefa-acoes";
import { STATUS_TAREFA_SEED } from "@/features/central-prazos/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { identificarProcesso } from "@/features/central-prazos/agregador";

export default async function TarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tarefa }, { data: processosDb }, { data: statusDb }] = await Promise.all([
    supabase.from("central_tarefas").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora")
      .order("created_at", { ascending: false }),
    supabase.from("central_tarefas").select("valor:status"),
  ]);

  if (!tarefa) notFound();

  const processos = (processosDb ?? []).map((p) => ({ id: p.id, label: identificarProcesso(p) }));

  return (
    <main className="p-8 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/hoje"
            className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
          >
            ← Voltar
          </Link>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
            {tarefa.tipo === "evento" ? "Evento" : "Tarefa"}
          </h1>
        </div>
        <TarefaAcoes id={tarefa.id} concluida={tarefa.concluida_em !== null} />
      </div>

      <TarefaForm
        tarefa={tarefa}
        processos={processos}
        statusSugestoes={mesclarSugestoes(STATUS_TAREFA_SEED, statusDb)}
      />
    </main>
  );
}
