"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarAcaoPlano, salvarAcaoPlano, excluirAcaoPlano } from "./actions";
import { Botao } from "@/components/ui/button";
import { SelectResponsavel } from "@/components/ui/select-responsavel";
import type { EstrategiaPlanoAcaoRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** §13 do modelo — plano de ação pericial. */
export function PlanoAcaoPanel({
  estrategiaId,
  processoId,
  acoes,
  nomesResponsaveis,
}: {
  estrategiaId: string;
  processoId: string;
  acoes: EstrategiaPlanoAcaoRow[];
  nomesResponsaveis: string[];
}) {
  const ordenados = [...acoes].sort((a, b) => a.ordem - b.ordem);
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Plano de ação pericial</h2>
      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma ação cadastrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((item, i) => (
            <AcaoItem key={item.id} item={item} numero={i + 1} processoId={processoId} nomesResponsaveis={nomesResponsaveis} />
          ))}
        </ul>
      )}
      <NovaAcaoForm estrategiaId={estrategiaId} processoId={processoId} />
    </div>
  );
}

function AcaoItem({
  item,
  numero,
  processoId,
  nomesResponsaveis,
}: {
  item: EstrategiaPlanoAcaoRow;
  numero: number;
  processoId: string;
  nomesResponsaveis: string[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarAcaoPlano(formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }
  function excluir() {
    if (!window.confirm("Excluir esta ação? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const r = await excluirAcaoPlano(item.id, processoId);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{numero}. {item.acao}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
            <button type="button" onClick={excluir} disabled={isPending} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30">Excluir</button>
          </div>
        </div>
        {item.objetivo && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Objetivo: {item.objetivo}</p>}
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          {item.responsavel ? `Responsável: ${item.responsavel}` : "Sem responsável definido"}
          {item.prazo ? ` · Prazo: ${item.prazo.split("-").reverse().join("/")}` : ""}
          {item.status ? ` · ${item.status}` : ""}
        </p>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <div>
          <label className={labelClass}>Ação</label>
          <input name="acao" defaultValue={item.acao} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Objetivo</label>
          <textarea name="objetivo" rows={2} defaultValue={item.objetivo ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Responsável</label>
            <SelectResponsavel name="responsavel" defaultValue={item.responsavel} nomes={nomesResponsaveis} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input name="prazo" type="date" defaultValue={item.prazo ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <input name="status" defaultValue={item.status ?? ""} className={inputClass} />
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

function NovaAcaoForm({ estrategiaId, processoId }: { estrategiaId: string; processoId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  function adicionar() {
    setErro(null);
    startTransition(async () => {
      const r = await criarAcaoPlano(estrategiaId, processoId);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }
  return (
    <div className="pt-1">
      <Botao variante="secundaria" onClick={adicionar} disabled={isPending} carregando={isPending} textoCarregando="Adicionando…">+ Adicionar ação</Botao>
      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
    </div>
  );
}
