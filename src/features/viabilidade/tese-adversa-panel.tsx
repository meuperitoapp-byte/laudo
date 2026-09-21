"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarTeseAdversa, criarTeseAdversa, excluirTeseAdversa } from "./actions";
import { Botao } from "@/components/ui/button";
import type { CasoTeseAdversaRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/**
 * Possível tese adversa (§24) — CRUD repetível, INTEIRAMENTE INTERNA (como
 * não há defesa formal ainda, usa "Possível Tese Adversa"; a função
 * geradora do PDF, fatia 8, nunca aceita esta tabela como entrada).
 */
export function TeseAdversaPanel({
  processoId,
  itens,
  documentos,
}: {
  processoId: string;
  itens: CasoTeseAdversaRow[];
  documentos: DocumentosRow[];
}) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const documentoPorId = new Map(documentos.map((d) => [d.id, d]));

  return (
    <div className="rounded-xl border border-ambar-400 dark:border-ambar-600 bg-ambar-100/50 dark:bg-ambar-950/20 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Possível tese adversa</h2>
        <p className="text-xs text-ambar-600 dark:text-ambar-400 mt-0.5">
          §24 — interno, nunca aparece no laudo/PDF entregue. Uso exclusivo de bastidor.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma tese adversa cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <TeseAdversaItem
              key={item.id}
              item={item}
              processoId={processoId}
              documentos={documentos}
              documento={item.documento_id ? (documentoPorId.get(item.documento_id) ?? null) : null}
            />
          ))}
        </ul>
      )}

      <NovaTeseAdversaForm processoId={processoId} documentos={documentos} />
    </div>
  );
}

function TeseAdversaItem({
  item,
  processoId,
  documentos,
  documento,
}: {
  item: CasoTeseAdversaRow;
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
      const resultado = await atualizarTeseAdversa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir esta possível tese adversa? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirTeseAdversa(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-950/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.argumento_previsivel}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[item.forca_estimada, documento && `doc.: ${documento.nome_arquivo}`].filter(Boolean).join(" · ")}
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
          <label className={labelClass}>Argumento previsível</label>
          <textarea name="argumento_previsivel" rows={2} defaultValue={item.argumento_previsivel} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Fundamento possível</label>
          <textarea name="fundamento_possivel" rows={2} defaultValue={item.fundamento_possivel ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Documento que pode sustentá-lo</label>
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
            <label className={labelClass}>Força estimada</label>
            <input type="text" name="forca_estimada" defaultValue={item.forca_estimada ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Resposta técnica possível</label>
          <textarea name="resposta_tecnica_possivel" rows={2} defaultValue={item.resposta_tecnica_possivel ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prova necessária</label>
          <textarea name="prova_necessaria" rows={2} defaultValue={item.prova_necessaria ?? ""} className={inputClass} />
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

function NovaTeseAdversaForm({ processoId, documentos }: { processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarTeseAdversa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-tese-adversa-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-tese-adversa-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-ambar-400 dark:border-ambar-600 bg-white dark:bg-nevoa-900/40 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar possível tese adversa</h3>
      <div>
        <label className={labelClass}>Argumento previsível</label>
        <textarea name="argumento_previsivel" rows={2} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Fundamento possível</label>
        <textarea name="fundamento_possivel" rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Documento que pode sustentá-lo</label>
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
          <label className={labelClass}>Força estimada</label>
          <input type="text" name="forca_estimada" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Resposta técnica possível</label>
        <textarea name="resposta_tecnica_possivel" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Prova necessária</label>
        <textarea name="prova_necessaria" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
