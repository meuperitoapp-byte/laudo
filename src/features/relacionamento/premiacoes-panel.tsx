"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarPremiacao, salvarPremiacao } from "./actions";
import { PREMIACAO_STATUS_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { RelacionamentoPremiacoesRow } from "@/types/database";
import type { PremiacaoStatus } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const STATUS_SELO: Record<PremiacaoStatus, "neutro" | "atencao" | "sucesso"> = {
  a_enviar: "atencao",
  enviado: "neutro",
  entregue: "sucesso",
};

/** §12 do modelo — histórico permanente de premiações por campanha. */
export function PremiacoesPanel({ relacionamentoId, premiacoes }: { relacionamentoId: string; premiacoes: RelacionamentoPremiacoesRow[] }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Premiações</h2>
      {premiacoes.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma premiação registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {premiacoes.map((p) => (
            <PremiacaoItem key={p.id} item={p} relacionamentoId={relacionamentoId} />
          ))}
        </ul>
      )}
      <NovaPremiacaoForm relacionamentoId={relacionamentoId} />
    </div>
  );
}

function PremiacaoItem({ item, relacionamentoId }: { item: RelacionamentoPremiacoesRow; relacionamentoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarPremiacao(item.id, relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{item.premiacao}</p>
            {item.campanha && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Campanha: {item.campanha}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Selo variante={STATUS_SELO[item.status]}>{PREMIACAO_STATUS_ROTULOS[item.status]}</Selo>
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
          </div>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <div>
          <label className={labelClass}>Premiação</label>
          <input name="premiacao" defaultValue={item.premiacao} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Campanha</label>
          <input name="campanha" defaultValue={item.campanha ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue={item.status} className={inputClass}>
              {Object.entries(PREMIACAO_STATUS_ROTULOS).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Data prevista</label>
            <input type="date" name="data_prevista" defaultValue={item.data_prevista ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data enviada</label>
            <input type="date" name="data_enviada" defaultValue={item.data_enviada ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Observação</label>
          <textarea name="observacao" rows={2} defaultValue={item.observacao ?? ""} className={inputClass} />
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovaPremiacaoForm({ relacionamentoId }: { relacionamentoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarPremiacao(relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Registrar premiação</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <div>
        <label className={labelClass}>Premiação *</label>
        <input name="premiacao" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Campanha</label>
        <input name="campanha" className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Registrar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
