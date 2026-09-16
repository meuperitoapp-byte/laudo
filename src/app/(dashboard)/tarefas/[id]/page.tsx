import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TarefaForm } from "@/features/central-prazos/tarefa-form";
import { ExcluirTarefaBotao, ConcluirTarefaBotao } from "@/features/central-prazos/tarefa-acoes";
import { STATUS_TAREFA_SEED, RESPONSAVEL_TAREFA_SEED } from "@/features/central-prazos/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { identificarProcesso } from "@/features/central-prazos/agregador";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function TarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: tarefa, error: erroTarefa },
    { data: processosDb, error: erroProcessos },
    { data: statusDb, error: erroStatus },
    { data: responsavelDb, error: erroResponsavel },
  ] = await Promise.all([
    supabase.from("central_tarefas").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora")
      .order("created_at", { ascending: false }),
    supabase.from("central_tarefas").select("valor:status"),
    supabase.from("central_tarefas").select("valor:responsavel"),
  ]);

  // `.maybeSingle()` só devolve `data: null` sem erro quando de fato não há
  // linha — qualquer `error` aqui é falha de leitura, nunca "não existe".
  if (erroTarefa) {
    console.error(`Tarefa ${id}: falha ao buscar:`, erroTarefa.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tarefa agora" />;
  }
  if (!tarefa) notFound();
  if (erroProcessos) console.error(`Tarefa ${id}: falha ao buscar processos:`, erroProcessos.message);
  if (erroStatus) console.error(`Tarefa ${id}: falha ao buscar sugestões de status:`, erroStatus.message);
  if (erroResponsavel) console.error(`Tarefa ${id}: falha ao buscar sugestões de responsável:`, erroResponsavel.message);

  const processos = (processosDb ?? []).map((p) => ({ id: p.id, label: identificarProcesso(p) }));

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
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
        <ExcluirTarefaBotao id={tarefa.id} />
      </div>

      {erroProcessos && (
        <BannerErroConsulta mensagem="Não consegui carregar a lista de processos agora — o vínculo com processo pode não aparecer certo." />
      )}

      <TarefaForm
        tarefa={tarefa}
        processos={processos}
        statusSugestoes={mesclarSugestoes(STATUS_TAREFA_SEED, statusDb)}
        responsavelSugestoes={mesclarSugestoes(RESPONSAVEL_TAREFA_SEED, responsavelDb)}
      />

      <ConcluirTarefaBotao id={tarefa.id} tipo={tarefa.tipo} concluida={tarefa.concluida_em !== null} />
    </main>
  );
}
