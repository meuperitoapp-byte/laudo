"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarFragilidade, criarFragilidade, excluirFragilidade } from "./actions";
import { IMPACTO_FRAGILIDADE_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoFragilidadesRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/** Fragilidades (§21) — CRUD repetível. */
export function FragilidadesPanel({ processoId, itens }: { processoId: string; itens: CasoFragilidadesRow[] }) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Fragilidades</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">§21</p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma fragilidade cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <FragilidadeItem key={item.id} item={item} processoId={processoId} />
          ))}
        </ul>
      )}

      <NovaFragilidadeForm processoId={processoId} />
    </div>
  );
}

function FragilidadeItem({ item, processoId }: { item: CasoFragilidadesRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarFragilidade(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir esta fragilidade? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirFragilidade(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.descricao}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[
                item.impacto && IMPACTO_FRAGILIDADE_ROTULOS[item.impacto],
                item.responsavel && `resp.: ${item.responsavel}`,
                item.prazo && `prazo: ${item.prazo}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={excluir}
              disabled={isPending}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30"
            >
              Excluir
            </button>
          </div>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea name="descricao" rows={2} defaultValue={item.descricao} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Motivo</label>
            <textarea name="motivo" rows={2} defaultValue={item.motivo ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Evidência</label>
            <textarea name="evidencia" rows={2} defaultValue={item.evidencia ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Impacto</label>
            <select name="impacto" defaultValue={item.impacto ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(IMPACTO_FRAGILIDADE_ROTULOS) as (keyof typeof IMPACTO_FRAGILIDADE_ROTULOS)[]).map((i) => (
                <option key={i} value={i}>
                  {IMPACTO_FRAGILIDADE_ROTULOS[i]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Possibilidade de mitigação</label>
            <input type="text" name="possibilidade_mitigacao" defaultValue={item.possibilidade_mitigacao ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Prova necessária</label>
          <textarea name="prova_necessaria" rows={2} defaultValue={item.prova_necessaria ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Responsável</label>
            <input type="text" name="responsavel" defaultValue={item.responsavel ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input type="date" name="prazo" defaultValue={item.prazo ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
            Salvar
          </Botao>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
          >
            Cancelar
          </button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovaFragilidadeForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarFragilidade(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-fragilidade-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-fragilidade-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar fragilidade</h3>
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea name="descricao" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Motivo</label>
          <textarea name="motivo" rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Evidência</label>
          <textarea name="evidencia" rows={2} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Impacto</label>
          <select name="impacto" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(IMPACTO_FRAGILIDADE_ROTULOS) as (keyof typeof IMPACTO_FRAGILIDADE_ROTULOS)[]).map((i) => (
              <option key={i} value={i}>
                {IMPACTO_FRAGILIDADE_ROTULOS[i]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Possibilidade de mitigação</label>
          <input type="text" name="possibilidade_mitigacao" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Prova necessária</label>
        <textarea name="prova_necessaria" rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Responsável</label>
          <input type="text" name="responsavel" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prazo</label>
          <input type="date" name="prazo" className={inputClass} />
        </div>
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
