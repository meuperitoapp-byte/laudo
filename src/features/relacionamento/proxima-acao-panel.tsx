"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarProximaAcao } from "./actions";
import { Botao } from "@/components/ui/button";
import type { RelacionamentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

export function ProximaAcaoPanel({ relacionamento }: { relacionamento: RelacionamentosRow }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarProximaAcao(relacionamento.id, formData);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Próxima ação</h2>
      <form action={salvar} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>Ação</label>
          <input name="proxima_acao_texto" defaultValue={relacionamento.proxima_acao_texto ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Data</label>
          <input type="date" name="proxima_acao_data" defaultValue={relacionamento.proxima_acao_data ?? ""} className={inputClass} />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Motivo</label>
          <input name="proxima_acao_motivo" defaultValue={relacionamento.proxima_acao_motivo ?? ""} className={inputClass} />
        </div>
        <div className="sm:col-span-3 flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </div>
  );
}
