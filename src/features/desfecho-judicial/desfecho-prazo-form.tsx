"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPrazoDesfechoPendente } from "./actions";
import { Botao } from "@/components/ui/button";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** §24.5 — configuração do alerta de desfecho judicial pendente. */
export function DesfechoPrazoForm({ prazoDias }: { prazoDias: number }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const r = await salvarPrazoDesfechoPendente(formData);
      if ("error" in r) return setErro(r.error);
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Desfecho Judicial — alerta de pendência</h2>
      <form action={salvar} className="flex items-end gap-3">
        <div>
          <label className={labelClass}>Alertar após (dias sem desfecho atualizado)</label>
          <input type="number" name="prazo_dias_desfecho_judicial_pendente" defaultValue={prazoDias} className={inputClass} />
        </div>
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
        {ok && <span className="text-sm text-musgo-600 dark:text-musgo-400">Salvo.</span>}
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </form>
    </div>
  );
}
