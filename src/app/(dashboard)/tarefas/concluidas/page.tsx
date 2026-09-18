import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
};

/**
 * Histórico de tarefas/eventos concluídos — item #4 da fila de melhorias
 * (19-20/09/2026). Antes, marcar como concluído fazia o item sumir de
 * `/hoje` sem nenhum outro lugar pra revisar depois ("conheço meu
 * legado..rsrs"). Só lê `central_tarefas` (é a única tabela com o conceito
 * de `concluida_em` — as outras pendências do painel de hoje vêm de
 * ciclos/laudos que têm seus próprios estados, não "concluído" avulso).
 */
export default async function TarefasConcluidasPage() {
  const supabase = await createClient();
  const { data: tarefas, error } = await supabase
    .from("central_tarefas")
    .select("id, tipo, titulo, data, concluida_em")
    .not("concluida_em", "is", null)
    .order("concluida_em", { ascending: false });

  if (error) console.error("Erro ao carregar tarefas concluídas:", error);

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <Link
          href="/hoje"
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
          Tarefas e eventos concluídos
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Itens que já foram marcados como concluídos ou realizados.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-vinho-400 bg-vinho-100 dark:bg-vinho-950 dark:border-vinho-800 px-4 py-3 text-sm text-vinho-700 dark:text-vinho-300">
          Não foi possível carregar o histórico agora.
        </div>
      )}

      {!error && (tarefas ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
          <CheckCircle2 className="h-8 w-8 text-musgo-600 dark:text-musgo-400" />
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">
            Nada concluído ainda.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {(tarefas ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/tarefas/${t.id}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 px-4 py-3.5 text-sm transition-colors hover:border-petroleo-400 dark:hover:border-petroleo-600"
              >
                <CheckCircle2 className="h-4 w-4 text-musgo-600 dark:text-musgo-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-nevoa-900 dark:text-nevoa-100 truncate">{t.titulo}</p>
                  <p className="text-nevoa-500 dark:text-nevoa-400">
                    {t.tipo === "evento" ? "Evento" : "Tarefa"} · {dataCurta(t.data)}
                  </p>
                </div>
                {t.concluida_em && (
                  <p className="text-xs text-nevoa-500 dark:text-nevoa-400 shrink-0">
                    Concluído em {dataCurta(t.concluida_em)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
