"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { concluirItemCentral, marcarTarefaConcluida } from "./actions";
import { Botao } from "@/components/ui/button";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

/**
 * "Concluir" no próprio card de "O que cumprir"/Hoje (lote 15/10/2026,
 * relato dela: "não aparece nenhuma opção para tirar essa demanda da minha
 * tela"). Abre inline (sem `window.confirm`/modal) com um motivo opcional —
 * ex.: "orçamento enviado, cliente não aprovou por condições financeiras".
 * Tarefa manual reaproveita a conclusão que já existia (central_tarefas);
 * item automático grava em central_itens_concluidos.
 */
export function ConcluirItemBotao({ itemId, assinatura, tarefaId }: { itemId: string; assinatura: string; tarefaId: string | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const r = tarefaId ? await marcarTarefaConcluida(tarefaId, true) : await concluirItemCentral(itemId, assinatura, motivo);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 text-xs font-medium text-nevoa-600 dark:text-nevoa-300 hover:bg-musgo-100 hover:text-musgo-700 hover:border-musgo-300 dark:hover:bg-musgo-950 dark:hover:text-musgo-300 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
        Concluir
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 pt-2 border-t border-nevoa-100 dark:border-nevoa-800">
      {!tarefaId && (
        <div>
          <label htmlFor={`motivo-${itemId}`} className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
            O que aconteceu? (opcional)
          </label>
          <input
            id={`motivo-${itemId}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: orçamento enviado, cliente não aprovou"
            className={inputClass}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Botao onClick={confirmar} carregando={isPending} textoCarregando="Concluindo…">
          {tarefaId ? "Marcar tarefa como concluída" : "Concluir e tirar da lista"}
        </Botao>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={isPending}
          className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
        >
          Cancelar
        </button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </div>
  );
}
