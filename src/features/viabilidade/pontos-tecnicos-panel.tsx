"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarPontoTecnico, criarPontoTecnico, excluirPontoTecnico } from "./actions";
import { Botao } from "@/components/ui/button";
import type { CasoPontosTecnicosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/**
 * Pontos técnicos relevantes / possíveis controvérsias (§13). Como ainda
 * não existe processo formal, o spec usa "possível controvérsia" — nunca
 * "versão da parte contrária" (esse vocabulário só faria sentido depois de
 * ajuizado). Alimenta Estratégia/Quesitos/preparação pra perícia/análise
 * do laudo/impugnação quando esses módulos existirem (§40).
 */
export function PontosTecnicosPanel({ processoId, itens }: { processoId: string; itens: CasoPontosTecnicosRow[] }) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Pontos técnicos relevantes / possíveis controvérsias
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          §13 — como ainda não há processo, usa &ldquo;possível controvérsia&rdquo;, nunca &ldquo;versão da parte contrária&rdquo;.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum ponto técnico cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <PontoTecnicoItem key={item.id} item={item} processoId={processoId} />
          ))}
        </ul>
      )}

      <NovoPontoTecnicoForm processoId={processoId} />
    </div>
  );
}

function PontoTecnicoItem({ item, processoId }: { item: CasoPontosTecnicosRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarPontoTecnico(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir o ponto técnico "${item.ponto_tecnico}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirPontoTecnico(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.ponto_tecnico}</p>
            {item.possivel_controversia && (
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
                Possível controvérsia: {item.possivel_controversia}
              </p>
            )}
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
          <label className={labelClass}>Ponto técnico</label>
          <textarea name="ponto_tecnico" rows={2} defaultValue={item.ponto_tecnico} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Narrativa apresentada</label>
          <textarea name="narrativa_apresentada" rows={2} defaultValue={item.narrativa_apresentada ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Evidência documental</label>
          <textarea name="evidencia_documental" rows={2} defaultValue={item.evidencia_documental ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Possível controvérsia</label>
          <textarea name="possivel_controversia" rows={2} defaultValue={item.possivel_controversia ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Avaliação técnica</label>
          <textarea name="avaliacao_tecnica" rows={2} defaultValue={item.avaliacao_tecnica ?? ""} className={inputClass} />
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

function NovoPontoTecnicoForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarPontoTecnico(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-novo-ponto-tecnico-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-novo-ponto-tecnico-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar ponto técnico</h3>
      <div>
        <label className={labelClass}>Ponto técnico</label>
        <textarea name="ponto_tecnico" rows={2} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Narrativa apresentada</label>
        <textarea name="narrativa_apresentada" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Evidência documental</label>
        <textarea name="evidencia_documental" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Possível controvérsia</label>
        <textarea name="possivel_controversia" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Avaliação técnica</label>
        <textarea name="avaliacao_tecnica" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
