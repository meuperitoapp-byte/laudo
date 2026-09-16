import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TarefaForm } from "@/features/central-prazos/tarefa-form";
import { STATUS_TAREFA_SEED, RESPONSAVEL_TAREFA_SEED } from "@/features/central-prazos/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { identificarProcesso } from "@/features/central-prazos/agregador";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function NovaTarefaPage() {
  const supabase = await createClient();
  const [
    { data: processosDb, error: erroProcessos },
    { data: statusDb, error: erroStatus },
    { data: responsavelDb, error: erroResponsavel },
  ] = await Promise.all([
    supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora")
      .order("created_at", { ascending: false }),
    supabase.from("central_tarefas").select("valor:status"),
    supabase.from("central_tarefas").select("valor:responsavel"),
  ]);
  if (erroProcessos) console.error("Nova tarefa: falha ao buscar processos:", erroProcessos.message);
  if (erroStatus) console.error("Nova tarefa: falha ao buscar sugestões de status:", erroStatus.message);
  if (erroResponsavel) console.error("Nova tarefa: falha ao buscar sugestões de responsável:", erroResponsavel.message);

  const processos = (processosDb ?? []).map((p) => ({ id: p.id, label: identificarProcesso(p) }));

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/hoje"
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
          Nova tarefa ou evento
        </h1>
      </div>
      {erroProcessos && (
        <BannerErroConsulta mensagem="Não consegui carregar a lista de processos agora — a tarefa pode ser salva mesmo assim, sem vincular a um processo." />
      )}
      <TarefaForm
        tarefa={null}
        processos={processos}
        statusSugestoes={mesclarSugestoes(STATUS_TAREFA_SEED, statusDb)}
        responsavelSugestoes={mesclarSugestoes(RESPONSAVEL_TAREFA_SEED, responsavelDb)}
      />
    </main>
  );
}
