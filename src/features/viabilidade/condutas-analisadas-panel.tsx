"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarCondutaAnalisada, criarCondutaAnalisada, excluirCondutaAnalisada } from "./actions";
import { AVALIACAO_CONDUTA_ROTULOS, GRAU_SEGURANCA_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoCondutasAnalisadasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/** Condutas analisadas (§14) — aceita múltiplos profissionais/instituições, uma linha por agente avaliado (nunca uma avaliação genérica só). */
export function CondutasAnalisadasPanel({ processoId, itens }: { processoId: string; itens: CasoCondutasAnalisadasRow[] }) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Condutas analisadas</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">§14 — individualize cada profissional/instituição avaliado.</p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma conduta cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <CondutaItem key={item.id} item={item} processoId={processoId} />
          ))}
        </ul>
      )}

      <NovaCondutaForm processoId={processoId} />
    </div>
  );
}

function CondutaItem({ item, processoId }: { item: CasoCondutasAnalisadasRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarCondutaAnalisada(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir a conduta de "${item.profissional_instituicao}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirCondutaAnalisada(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">
              {item.profissional_instituicao}
              {item.papel ? ` (${item.papel})` : ""}
            </p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[item.avaliacao && AVALIACAO_CONDUTA_ROTULOS[item.avaliacao], item.seguranca && `segurança: ${GRAU_SEGURANCA_ROTULOS[item.seguranca]}`]
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Profissional/instituição</label>
            <input name="profissional_instituicao" defaultValue={item.profissional_instituicao} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Papel</label>
            <input name="papel" defaultValue={item.papel ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Período — início</label>
            <input type="date" name="periodo_inicio" defaultValue={item.periodo_inicio ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Período — fim</label>
            <input type="date" name="periodo_fim" defaultValue={item.periodo_fim ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Conduta questionada</label>
          <textarea name="conduta_questionada" rows={2} defaultValue={item.conduta_questionada ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Conduta documentada</label>
          <textarea name="conduta_documentada" rows={2} defaultValue={item.conduta_documentada ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Conduta tecnicamente esperada</label>
          <textarea name="conduta_esperada" rows={2} defaultValue={item.conduta_esperada ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fonte</label>
            <input name="fonte" defaultValue={item.fonte ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Literatura/norma</label>
            <input name="literatura_norma" defaultValue={item.literatura_norma ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Avaliação</label>
            <select name="avaliacao" defaultValue={item.avaliacao ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(AVALIACAO_CONDUTA_ROTULOS) as (keyof typeof AVALIACAO_CONDUTA_ROTULOS)[]).map((a) => (
                <option key={a} value={a}>
                  {AVALIACAO_CONDUTA_ROTULOS[a]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Segurança</label>
            <select name="seguranca" defaultValue={item.seguranca ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(GRAU_SEGURANCA_ROTULOS) as (keyof typeof GRAU_SEGURANCA_ROTULOS)[]).map((s) => (
                <option key={s} value={s}>
                  {GRAU_SEGURANCA_ROTULOS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Repercussão</label>
          <textarea name="repercussao" rows={2} defaultValue={item.repercussao ?? ""} className={inputClass} />
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

function NovaCondutaForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarCondutaAnalisada(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-conduta-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-conduta-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar conduta</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Profissional/instituição</label>
          <input name="profissional_instituicao" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Papel</label>
          <input name="papel" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Período — início</label>
          <input type="date" name="periodo_inicio" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Período — fim</label>
          <input type="date" name="periodo_fim" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Conduta questionada</label>
        <textarea name="conduta_questionada" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Conduta documentada</label>
        <textarea name="conduta_documentada" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Conduta tecnicamente esperada</label>
        <textarea name="conduta_esperada" rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fonte</label>
          <input name="fonte" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Literatura/norma</label>
          <input name="literatura_norma" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Avaliação</label>
          <select name="avaliacao" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(AVALIACAO_CONDUTA_ROTULOS) as (keyof typeof AVALIACAO_CONDUTA_ROTULOS)[]).map((a) => (
              <option key={a} value={a}>
                {AVALIACAO_CONDUTA_ROTULOS[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Segurança</label>
          <select name="seguranca" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(GRAU_SEGURANCA_ROTULOS) as (keyof typeof GRAU_SEGURANCA_ROTULOS)[]).map((s) => (
              <option key={s} value={s}>
                {GRAU_SEGURANCA_ROTULOS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Repercussão</label>
        <textarea name="repercussao" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
