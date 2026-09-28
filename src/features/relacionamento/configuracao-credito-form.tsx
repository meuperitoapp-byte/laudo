"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarValorCreditoPadrao } from "./actions";
import { Botao } from "@/components/ui/button";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** §13 — valor padrão do crédito de indicação, configurável pela gestão (nunca fixo no código). */
export function ConfiguracaoCreditoForm({ valorAtual }: { valorAtual: number }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const r = await salvarValorCreditoPadrao(formData);
      if ("error" in r) return setErro(r.error);
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Crédito de indicação — valor padrão</h2>
      <form action={salvar} className="flex items-end gap-3">
        <div>
          <label className={labelClass}>Valor padrão (R$)</label>
          <input type="number" step="0.01" name="valor_credito_indicacao_padrao" defaultValue={valorAtual} className={inputClass} />
        </div>
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
        {ok && <span className="text-sm text-musgo-600 dark:text-musgo-400">Salvo.</span>}
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </form>
    </div>
  );
}
