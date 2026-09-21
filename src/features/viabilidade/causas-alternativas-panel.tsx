"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarCausaAlternativa, criarCausaAlternativa, excluirCausaAlternativa } from "./actions";
import { PLAUSIBILIDADE_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoCausasAlternativasRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/** Causas alternativas (§19) — CRUD repetível. */
export function CausasAlternativasPanel({
  processoId,
  itens,
  documentos,
}: {
  processoId: string;
  itens: CasoCausasAlternativasRow[];
  documentos: DocumentosRow[];
}) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const documentoPorId = new Map(documentos.map((d) => [d.id, d]));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Causas alternativas</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">§19</p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma causa alternativa cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <CausaAlternativaItem
              key={item.id}
              item={item}
              processoId={processoId}
              documentos={documentos}
              documento={item.documento_id ? (documentoPorId.get(item.documento_id) ?? null) : null}
            />
          ))}
        </ul>
      )}

      <NovaCausaAlternativaForm processoId={processoId} documentos={documentos} />
    </div>
  );
}

function CausaAlternativaItem({
  item,
  processoId,
  documentos,
  documento,
}: {
  item: CasoCausasAlternativasRow;
  processoId: string;
  documentos: DocumentosRow[];
  documento: DocumentosRow | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarCausaAlternativa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir a hipótese "${item.hipotese}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirCausaAlternativa(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.hipotese}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[item.plausibilidade && PLAUSIBILIDADE_ROTULOS[item.plausibilidade], documento && `doc.: ${documento.nome_arquivo}`]
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
          <label className={labelClass}>Hipótese alternativa</label>
          <textarea name="hipotese" rows={2} defaultValue={item.hipotese} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Elementos favoráveis</label>
            <textarea name="elementos_favoraveis" rows={2} defaultValue={item.elementos_favoraveis ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Elementos contrários</label>
            <textarea name="elementos_contrarios" rows={2} defaultValue={item.elementos_contrarios ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Documento</label>
            <select name="documento_id" defaultValue={item.documento_id ?? ""} className={inputClass}>
              <option value="">— Nenhum —</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome_arquivo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Plausibilidade</label>
            <select name="plausibilidade" defaultValue={item.plausibilidade ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(PLAUSIBILIDADE_ROTULOS) as (keyof typeof PLAUSIBILIDADE_ROTULOS)[]).map((p) => (
                <option key={p} value={p}>
                  {PLAUSIBILIDADE_ROTULOS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Impacto sobre a tese</label>
          <textarea name="impacto_sobre_tese" rows={2} defaultValue={item.impacto_sobre_tese ?? ""} className={inputClass} />
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

function NovaCausaAlternativaForm({ processoId, documentos }: { processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarCausaAlternativa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-causa-alternativa-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-causa-alternativa-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar causa alternativa</h3>
      <div>
        <label className={labelClass}>Hipótese alternativa</label>
        <textarea name="hipotese" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Elementos favoráveis</label>
          <textarea name="elementos_favoraveis" rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Elementos contrários</label>
          <textarea name="elementos_contrarios" rows={2} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Documento</label>
          <select name="documento_id" className={inputClass} defaultValue="">
            <option value="">— Nenhum —</option>
            {documentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_arquivo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Plausibilidade</label>
          <select name="plausibilidade" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(PLAUSIBILIDADE_ROTULOS) as (keyof typeof PLAUSIBILIDADE_ROTULOS)[]).map((p) => (
              <option key={p} value={p}>
                {PLAUSIBILIDADE_ROTULOS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Impacto sobre a tese</label>
        <textarea name="impacto_sobre_tese" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
