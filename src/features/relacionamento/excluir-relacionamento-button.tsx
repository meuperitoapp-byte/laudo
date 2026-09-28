"use client";

import { useState, useTransition } from "react";
import { excluirRelacionamento } from "./actions";

/**
 * Exclusão mais simples que a de processo (window.confirm, não diálogo com
 * digitação) — aqui não há cascata destrutiva de conteúdo importante:
 * processos vinculados apenas se desvinculam (ON DELETE SET NULL), e o
 * histórico de contatos/premiações desse cadastro é o único conteúdo
 * realmente perdido.
 */
export function ExcluirRelacionamentoButton({ id, nome }: { id: string; nome: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!window.confirm(`Excluir "${nome}"? Processos vinculados não são apagados, só se desvinculam. Não há como desfazer.`)) return;
    startTransition(async () => {
      const r = await excluirRelacionamento(id);
      if (r && "error" in r) setErro(r.error);
      // Sucesso redireciona pra /relacionamento dentro da própria action.
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={excluir}
        disabled={isPending}
        className="text-sm text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-50"
      >
        {isPending ? "Excluindo…" : "Excluir"}
      </button>
      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
