"use client";

import { useRef, useState, useTransition } from "react";
import { marcarTarefaConcluida, excluirTarefaCentral } from "./actions";
import { Botao } from "@/components/ui/button";

/**
 * Concluir/reabrir e excluir — separado do `TarefaForm` porque não passam
 * por FormData de edição normal (são ações diretas de um clique, não um
 * "Salvar"). Exclusão sem confirmação por digitação (diferente da de
 * processo): tarefa avulsa não carrega documento nem histórico, então o
 * risco de perder algo irrecuperável é bem menor.
 */
export function TarefaAcoes({ id, concluida }: { id: string; concluida: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function alternarConcluida() {
    setErro(null);
    startTransition(async () => {
      const r = await marcarTarefaConcluida(id, !concluida);
      if (r && "error" in r) setErro(r.error);
    });
  }

  function confirmarExclusao() {
    startTransition(async () => {
      const r = await excluirTarefaCentral(id);
      if (r && "error" in r) setErro(r.error);
      // Sucesso redireciona pra /hoje dentro da própria action.
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Botao
        variante={concluida ? "secundaria" : "primaria"}
        onClick={alternarConcluida}
        disabled={isPending}
        carregando={isPending}
      >
        {concluida ? "Reabrir" : "Marcar como concluída"}
      </Botao>

      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-sm text-vinho-600 hover:underline dark:text-vinho-400"
      >
        Excluir
      </button>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

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
