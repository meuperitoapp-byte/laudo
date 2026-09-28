"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarRegra, salvarRegra } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { ContinuidadeRegrasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** §20.4 — catálogo de regras servico→próximo serviço→prazo, editável pela gestão sem alteração de código. */
export function RegrasPanel({ regras }: { regras: ContinuidadeRegrasRow[] }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Regras de continuidade</h2>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Serviço concluído → próximo serviço sugerido → prazo padrão de follow-up. Editável aqui, sem depender de mudança no sistema.</p>
      <ul className="space-y-2">
        {regras.map((r) => (
          <RegraItem key={r.id} item={r} />
        ))}
      </ul>
      <NovaRegraForm />
    </div>
  );
}

function RegraItem({ item }: { item: ContinuidadeRegrasRow }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarRegra(item.id, formData);
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
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{item.servico_origem} → {item.servico_destino_principal || "—"}</p>
            {item.gatilho && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Gatilho: {item.gatilho}</p>}
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Prazo padrão: {item.prazo_dias_padrao} dias</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!item.ativo && <Selo variante="neutro">Inativa</Selo>}
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
          <label className={labelClass}>Serviço de origem *</label>
          <input name="servico_origem" defaultValue={item.servico_origem} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Gatilho</label>
          <input name="gatilho" defaultValue={item.gatilho ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Próximo serviço principal</label>
          <input name="servico_destino_principal" defaultValue={item.servico_destino_principal ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Serviços alternativos (separados por vírgula)</label>
          <input name="servicos_alternativos" defaultValue={item.servicos_alternativos.join(", ")} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Prazo padrão (dias)</label>
            <input type="number" name="prazo_dias_padrao" defaultValue={item.prazo_dias_padrao} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300 self-end pb-2">
            <input type="checkbox" name="ativo" defaultChecked={item.ativo} />
            Ativa
          </label>
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

function NovaRegraForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarRegra(formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Nova regra</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <div>
        <label className={labelClass}>Serviço de origem *</label>
        <input name="servico_origem" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Gatilho</label>
        <input name="gatilho" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Próximo serviço principal</label>
        <input name="servico_destino_principal" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Serviços alternativos (separados por vírgula)</label>
        <input name="servicos_alternativos" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Prazo padrão (dias)</label>
        <input type="number" name="prazo_dias_padrao" defaultValue={7} className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Adicionar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
