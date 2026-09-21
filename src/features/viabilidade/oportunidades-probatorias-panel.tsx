"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarOportunidadeProbatoria,
  criarOportunidadeProbatoria,
  excluirOportunidadeProbatoria,
  resolverOportunidadeProbatoria,
} from "./actions";
import { TIPO_PROVA_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoOportunidadesProbatoriasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Oportunidades probatórias (§22) — SEMPRE visível enquanto não resolvida,
 * mesmo padrão de Documentos faltantes (§9): entra como fonte própria no
 * agregador da Central de Prazos, nunca em `central_tarefas`.
 */
export function OportunidadesProbatoriasPanel({
  processoId,
  itens,
}: {
  processoId: string;
  itens: CasoOportunidadesProbatoriasRow[];
}) {
  const pendentes = itens.filter((i) => !i.resolvido_em);
  const resolvidas = itens.filter((i) => i.resolvido_em);

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Oportunidades probatórias</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          §22 — aparece em Hoje e na Agenda enquanto não estiver resolvida; sem prazo, entra no bloco &ldquo;sem prazo&rdquo;.
        </p>
      </div>

      {pendentes.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma oportunidade probatória em aberto.</p>
      ) : (
        <ul className="space-y-2">
          {pendentes.map((item) => (
            <OportunidadeProbatoriaItem key={item.id} item={item} processoId={processoId} />
          ))}
        </ul>
      )}

      {resolvidas.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-nevoa-500 dark:text-nevoa-400">
            {resolvidas.length} resolvida{resolvidas.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {resolvidas.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-nevoa-500 dark:text-nevoa-400 px-1">
                <span className="truncate line-through">{item.providencia}</span>
                <span className="text-xs shrink-0">resolvida em {dataCurta(item.resolvido_em!)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <NovaOportunidadeProbatoriaForm processoId={processoId} />
    </div>
  );
}

function OportunidadeProbatoriaItem({
  item,
  processoId,
}: {
  item: CasoOportunidadesProbatoriasRow;
  processoId: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarOportunidadeProbatoria(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function resolver() {
    setErro(null);
    startTransition(async () => {
      const resultado = await resolverOportunidadeProbatoria(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir "${item.providencia}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirOportunidadeProbatoria(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.providencia}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[
                item.tipo_prova && TIPO_PROVA_ROTULOS[item.tipo_prova],
                item.responsavel ? `resp.: ${item.responsavel}` : "sem responsável definido",
                item.prazo && `prazo ${dataCurta(item.prazo)}`,
                item.prioridade,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={resolver}
              disabled={isPending}
              className="rounded-md border border-musgo-300 dark:border-musgo-800 text-musgo-600 dark:text-musgo-400 hover:bg-musgo-100 dark:hover:bg-musgo-950 px-2 py-1 text-xs disabled:opacity-30"
            >
              Marcar resolvida
            </button>
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
          <label className={labelClass}>Providência</label>
          <textarea name="providencia" rows={2} defaultValue={item.providencia} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo de prova</label>
            <select name="tipo_prova" defaultValue={item.tipo_prova ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(TIPO_PROVA_ROTULOS) as (keyof typeof TIPO_PROVA_ROTULOS)[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_PROVA_ROTULOS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Objetivo</label>
            <input name="objetivo" defaultValue={item.objetivo ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Responsável</label>
            <input name="responsavel" defaultValue={item.responsavel ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input type="date" name="prazo" defaultValue={item.prazo ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prioridade</label>
            <input name="prioridade" defaultValue={item.prioridade ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <input name="status" defaultValue={item.status ?? ""} className={inputClass} />
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

function NovaOportunidadeProbatoriaForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarOportunidadeProbatoria(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-oportunidade-probatoria-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-oportunidade-probatoria-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar oportunidade probatória</h3>
      <div>
        <label className={labelClass}>Providência</label>
        <textarea name="providencia" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tipo de prova</label>
          <select name="tipo_prova" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(TIPO_PROVA_ROTULOS) as (keyof typeof TIPO_PROVA_ROTULOS)[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_PROVA_ROTULOS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Objetivo</label>
          <input name="objetivo" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Responsável</label>
          <input name="responsavel" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prazo</label>
          <input type="date" name="prazo" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prioridade</label>
          <input name="prioridade" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <input name="status" className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
