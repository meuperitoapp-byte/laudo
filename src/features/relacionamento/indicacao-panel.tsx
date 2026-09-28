"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarCredito } from "./actions";
import { Botao } from "@/components/ui/button";
import type { RelacionamentoCreditosIndicacaoRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

function moedaBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** §13 — extrato de créditos de indicação. Só aparece na ficha de quem já indicou alguém pelo menos uma vez, ou que tem crédito lançado. */
export function IndicacaoPanel({
  indicadorId,
  creditos,
  valorPadrao,
}: {
  indicadorId: string;
  creditos: RelacionamentoCreditosIndicacaoRow[];
  valorPadrao: number;
}) {
  const saldo = creditos.reduce((s, c) => s + (c.tipo === "gerado" ? c.valor : -c.valor), 0);
  const ordenados = [...creditos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Créditos de indicação</h2>
        <span className="text-sm font-semibold text-petroleo-700 dark:text-petroleo-400">Saldo: {moedaBRL(saldo)}</span>
      </div>
      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum crédito lançado ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {ordenados.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-2">
              <span className="text-nevoa-700 dark:text-nevoa-300">
                {dataCurta(c.data)} — {c.tipo === "gerado" ? "Crédito gerado" : "Crédito utilizado"}
                {c.servico_relacionado ? ` (${c.servico_relacionado})` : ""}
              </span>
              <span className={c.tipo === "gerado" ? "text-musgo-600 dark:text-musgo-400 font-medium" : "text-vinho-600 dark:text-vinho-400 font-medium"}>
                {c.tipo === "gerado" ? "+" : "-"}{moedaBRL(c.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <NovoCreditoForm indicadorId={indicadorId} valorPadrao={valorPadrao} />
    </div>
  );
}

function NovoCreditoForm({ indicadorId, valorPadrao }: { indicadorId: string; valorPadrao: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function registrar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await registrarCredito(indicadorId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Lançar crédito</Botao>;
  }

  return (
    <form action={registrar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>Tipo *</label>
        <select name="tipo" required defaultValue="gerado" className={inputClass}>
          <option value="gerado">Gerado</option>
          <option value="utilizado">Utilizado</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Valor (R$) *</label>
        <input type="number" step="0.01" name="valor" required defaultValue={valorPadrao || undefined} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Data *</label>
        <input type="date" name="data" required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Serviço relacionado</label>
        <input name="servico_relacionado" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Observação</label>
        <input name="observacao" className={inputClass} />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Registrar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
