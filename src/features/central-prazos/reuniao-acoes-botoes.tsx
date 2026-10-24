"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { encerrarReuniaoEstrategiaPericial } from "@/features/processos/actions";
import type { ReuniaoEstrategiaSituacao } from "@/types/database";

const botaoClasse =
  "inline-flex items-center gap-1 rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 text-xs font-medium text-nevoa-600 dark:text-nevoa-300 transition-colors disabled:opacity-40";

/**
 * "Realizada"/"Cancelada" no card da reunião de Estratégia pericial na
 * Central de Prazos/Hoje (lote 20/10/2026, relato dela: o card não tinha como
 * finalizar a reunião e sair da tela). Mesma ação do card do processo —
 * registra no histórico e tira a reunião de "O que cumprir".
 */
export function ReuniaoAcoesBotoes({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function encerrar(situacao: ReuniaoEstrategiaSituacao) {
    const rotulo = situacao === "realizada" ? "realizada" : "cancelada";
    if (!window.confirm(`Marcar a reunião como ${rotulo}? Ela sai de "O que cumprir" e fica no histórico do processo.`)) return;
    setErro(null);
    startTransition(async () => {
      const r = await encerrarReuniaoEstrategiaPericial(processoId, situacao);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {erro && <span className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</span>}
      <button
        type="button"
        onClick={() => encerrar("realizada")}
        disabled={isPending}
        className={`${botaoClasse} hover:bg-musgo-100 hover:text-musgo-700 hover:border-musgo-300 dark:hover:bg-musgo-950 dark:hover:text-musgo-300`}
      >
        <Check className="h-3.5 w-3.5" />
        Realizada
      </button>
      <button
        type="button"
        onClick={() => encerrar("cancelada")}
        disabled={isPending}
        className={`${botaoClasse} hover:bg-nevoa-100 dark:hover:bg-nevoa-800`}
      >
        <X className="h-3.5 w-3.5" />
        Cancelada
      </button>
    </div>
  );
}
