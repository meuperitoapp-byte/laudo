"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarDataComemorativa, salvarDataComemorativa } from "./calendario-actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { DatasComemorativasProfissionaisRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

function ddmm(mmdd: string): string {
  const [mes, dia] = mmdd.split("-");
  return `${dia}/${mes}`;
}

/** §22.1 — datas comemorativas por profissão, configuráveis pela gestão. */
export function DatasComemorativasPanel({ datas }: { datas: DatasComemorativasProfissionaisRow[] }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Datas comemorativas por profissão</h2>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Usadas pelo Calendário Inteligente para alertar aniversários profissionais (ex.: Dia do Advogado).</p>
      <ul className="space-y-2">
        {datas.map((d) => (
          <DataItem key={d.id} item={d} />
        ))}
      </ul>
      <NovaDataForm />
    </div>
  );
}

function DataItem({ item }: { item: DatasComemorativasProfissionaisRow }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarDataComemorativa(item.id, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="flex items-center justify-between rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-2.5 text-sm">
        <span className="text-nevoa-800 dark:text-nevoa-200">{item.profissao} — {ddmm(item.data_comemorativa)}</span>
        <div className="flex items-center gap-2">
          {!item.ativo && <Selo variante="neutro">Inativa</Selo>}
          <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className={labelClass}>Profissão</label>
          <input name="profissao" defaultValue={item.profissao} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Data (MM-DD)</label>
          <input name="data_comemorativa" defaultValue={item.data_comemorativa} placeholder="10-18" pattern="\d{2}-\d{2}" required className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300 pb-2">
          <input type="checkbox" name="ativo" defaultChecked={item.ativo} />
          Ativa
        </label>
        <div className="sm:col-span-3 flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovaDataForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarDataComemorativa(formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Nova data comemorativa</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <div>
        <label className={labelClass}>Profissão *</label>
        <input name="profissao" required placeholder="Ex.: Fisioterapeuta" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Data (MM-DD) *</label>
        <input name="data_comemorativa" required placeholder="10-18" pattern="\d{2}-\d{2}" className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Adicionar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
      </div>
      {erro && <p className="sm:col-span-3 text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </form>
  );
}
