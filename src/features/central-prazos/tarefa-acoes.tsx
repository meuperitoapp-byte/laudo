"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marcarTarefaConcluida, excluirTarefaCentral } from "./actions";
import { Botao } from "@/components/ui/button";
import type { TipoCentralTarefa } from "@/types/enums";

/**
 * Excluir — fica no topo, ao lado de "Voltar" (ação de navegação/destrutiva,
 * separada da conclusão). Sem confirmação por digitação (diferente da de
 * processo): tarefa avulsa não carrega documento nem histórico, então o
 * risco de perder algo irrecuperável é bem menor.
 */
export function ExcluirTarefaBotao({ id }: { id: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmarExclusao() {
    startTransition(async () => {
      const r = await excluirTarefaCentral(id);
      if (r && "error" in r) setErro(r.error);
      // Sucesso redireciona pra /hoje dentro da própria action.
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-sm text-vinho-600 hover:underline dark:text-vinho-400"
      >
        Excluir
      </button>
      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-0 text-nevoa-900 dark:text-nevoa-100 backdrop:bg-nevoa-900/40"
      >
        <div className="p-6 space-y-4 text-sm">
          <h3 className="font-title text-base font-semibold text-vinho-700 dark:text-vinho-400">
            Excluir esta tarefa/evento?
          </h3>
          <p className="text-nevoa-700 dark:text-nevoa-300">Não há como desfazer.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Botao variante="secundaria" onClick={() => dialogRef.current?.close()} disabled={isPending}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={confirmarExclusao}
              disabled={isPending}
              carregando={isPending}
              textoCarregando="Excluindo…"
            >
              Excluir
            </Botao>
          </div>
        </div>
      </dialog>
    </div>
  );
}

const ROTULO_ACAO: Record<TipoCentralTarefa, { pendente: string; concluida: string }> = {
  tarefa: { pendente: "Marcar tarefa como concluída", concluida: "Reabrir tarefa" },
  evento: { pendente: "Marcar evento como realizado", concluida: "Reabrir evento" },
};

/**
 * Concluir/reabrir — item #4 da fila de melhorias (19-20/09/2026), dois
 * ajustes pedidos por ela:
 * 1. Rótulo contextual por tipo (antes era "Marcar como concluída" pros
 *    dois, e ela apontou que ao lado de um EVENTO isso pode ser lido como
 *    "o agendamento foi concluído" em vez de "o evento já aconteceu").
 * 2. Fica no fim da tela (depois do formulário), não mais no topo ao lado
 *    de Voltar/Excluir — ação deliberada, separada da navegação.
 * A perda de histórico que ela reportou (item concluído some de `/hoje`)
 * é resolvida por um link pra "Ver tarefas/eventos concluídos"
 * (`/tarefas/concluidas`), não por mudar o que soma do painel do dia a dia.
 */
export function ConcluirTarefaBotao({
  id,
  tipo,
  concluida,
}: {
  id: string;
  tipo: TipoCentralTarefa;
  concluida: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rotulos = ROTULO_ACAO[tipo];

  function alternarConcluida() {
    setErro(null);
    startTransition(async () => {
      const r = await marcarTarefaConcluida(id, !concluida);
      if (r && "error" in r) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <Botao
          variante={concluida ? "secundaria" : "primaria"}
          onClick={alternarConcluida}
          disabled={isPending}
          carregando={isPending}
        >
          {concluida ? rotulos.concluida : rotulos.pendente}
        </Botao>
        {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
      </div>
      <Link href="/tarefas/concluidas" className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
        Ver concluídos →
      </Link>
    </div>
  );
}
