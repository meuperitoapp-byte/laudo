"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarAnotacoesProcesso } from "./actions";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

/** Anotações livres do caso (pedido da secretária, 24/09/2026) — salva ao sair do campo, mesmo padrão informal de outros campos de texto solto do sistema. */
export function AnotacoesProcessoPanel({ processoId, anotacoes }: { processoId: string; anotacoes: string | null }) {
  const router = useRouter();
  const [texto, setTexto] = useState(anotacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const r = await salvarAnotacoesProcesso(processoId, texto.trim() || null);
    setSalvando(false);
    if ("error" in r) {
      setErro(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 pt-4 border-t border-nevoa-100 dark:border-nevoa-800">
      <label htmlFor="processo_anotacoes" className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
        Anotações do caso
      </label>
      <textarea
        id="processo_anotacoes"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        rows={3}
        placeholder="Observações importantes sobre o caso…"
        className={inputClass}
      />
      {salvando && <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mt-1">Salvando…</p>}
      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
    </div>
  );
}
