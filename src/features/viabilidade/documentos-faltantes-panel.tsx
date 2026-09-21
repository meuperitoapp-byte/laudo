"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarDocumentoFaltante,
  criarDocumentoFaltante,
  excluirDocumentoFaltante,
  resolverDocumentoFaltante,
} from "./actions";
import { IMPACTO_DOCUMENTO_FALTANTE_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoDocumentosFaltantesRow } from "@/types/database";

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
 * Documentos faltantes (§9) — SEMPRE visível, não gatilhado pela resposta
 * de Suficiência documental (decisão do Jeferson, 21/09/2026: Sim não
 * esconde o bloco, só não obriga preencher). Entra como fonte própria no
 * agregador da Central de Prazos (nunca em `central_tarefas`).
 */
export function DocumentosFaltantesPanel({ processoId, itens }: { processoId: string; itens: CasoDocumentosFaltantesRow[] }) {
  const pendentes = itens.filter((i) => !i.resolvido_em);
  const resolvidos = itens.filter((i) => i.resolvido_em);

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Documentos faltantes</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Aparece em Hoje e na Agenda enquanto não estiver resolvido — sem prazo, entra no bloco &ldquo;sem prazo&rdquo;.
        </p>
      </div>

      {pendentes.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum documento faltante em aberto.</p>
      ) : (
        <ul className="space-y-2">
          {pendentes.map((item) => (
            <DocumentoFaltanteItem key={item.id} item={item} processoId={processoId} />
          ))}
        </ul>
      )}

      {resolvidos.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-nevoa-500 dark:text-nevoa-400">
            {resolvidos.length} resolvido{resolvidos.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {resolvidos.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-nevoa-500 dark:text-nevoa-400 px-1">
                <span className="truncate line-through">{item.documento_necessario}</span>
                <span className="text-xs shrink-0">resolvido em {dataCurta(item.resolvido_em!)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <NovoDocumentoFaltanteForm processoId={processoId} />
    </div>
  );
}

function DocumentoFaltanteItem({ item, processoId }: { item: CasoDocumentosFaltantesRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarDocumentoFaltante(formData);
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
      const resultado = await resolverDocumentoFaltante(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir "${item.documento_necessario}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirDocumentoFaltante(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.documento_necessario}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[
                item.quem_provavelmente_possui && `com ${item.quem_provavelmente_possui}`,
                item.responsavel && `resp.: ${item.responsavel}`,
                item.prazo && `prazo ${dataCurta(item.prazo)}`,
                item.impacto && IMPACTO_DOCUMENTO_FALTANTE_ROTULOS[item.impacto],
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
              Marcar resolvido
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
          <label className={labelClass}>Documento necessário</label>
          <input name="documento_necessario" defaultValue={item.documento_necessario} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Justificativa técnica</label>
          <textarea name="justificativa_tecnica" rows={2} defaultValue={item.justificativa_tecnica ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Quem provavelmente possui</label>
            <input name="quem_provavelmente_possui" defaultValue={item.quem_provavelmente_possui ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Impacto da ausência</label>
            <select name="impacto" defaultValue={item.impacto ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(IMPACTO_DOCUMENTO_FALTANTE_ROTULOS) as (keyof typeof IMPACTO_DOCUMENTO_FALTANTE_ROTULOS)[]).map((i) => (
                <option key={i} value={i}>
                  {IMPACTO_DOCUMENTO_FALTANTE_ROTULOS[i]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Prioridade</label>
            <input name="prioridade" defaultValue={item.prioridade ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Responsável</label>
            <input name="responsavel" defaultValue={item.responsavel ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input type="date" name="prazo" defaultValue={item.prazo ?? ""} className={inputClass} />
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

function NovoDocumentoFaltanteForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarDocumentoFaltante(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-novo-doc-faltante-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-novo-doc-faltante-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar documento faltante</h3>
      <div>
        <label className={labelClass}>Documento necessário</label>
        <input name="documento_necessario" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Justificativa técnica</label>
        <textarea name="justificativa_tecnica" rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Quem provavelmente possui</label>
          <input name="quem_provavelmente_possui" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Impacto da ausência</label>
          <select name="impacto" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(IMPACTO_DOCUMENTO_FALTANTE_ROTULOS) as (keyof typeof IMPACTO_DOCUMENTO_FALTANTE_ROTULOS)[]).map((i) => (
              <option key={i} value={i}>
                {IMPACTO_DOCUMENTO_FALTANTE_ROTULOS[i]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Prioridade</label>
          <input name="prioridade" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Responsável</label>
          <input name="responsavel" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prazo</label>
          <input type="date" name="prazo" className={inputClass} />
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
