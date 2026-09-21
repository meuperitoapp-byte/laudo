"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarLiteraturaUtilizada, criarLiteraturaUtilizada, excluirLiteraturaUtilizada } from "./actions";
import { TIPO_LITERATURA_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoLiteraturaUtilizadaRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/**
 * Literatura e referências (§27) — CRUD repetível. `biblioteca_pericial_id`
 * é FK opcional pro catálogo reutilizável entre casos (já existe); aqui
 * fica de fora do formulário nesta fatia — vínculo automático fica pra
 * quando a tela de citar-a-partir-da-Biblioteca existir. Por enquanto toda
 * entrada é uma referência avulsa digitada.
 */
export function LiteraturaPanel({
  processoId,
  itens,
  documentos,
}: {
  processoId: string;
  itens: CasoLiteraturaUtilizadaRow[];
  documentos: DocumentosRow[];
}) {
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const documentoPorId = new Map(documentos.map((d) => [d.id, d]));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Literatura e referências</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">§27</p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma referência cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <LiteraturaItem
              key={item.id}
              item={item}
              processoId={processoId}
              documentos={documentos}
              arquivo={item.arquivo_documento_id ? (documentoPorId.get(item.arquivo_documento_id) ?? null) : null}
            />
          ))}
        </ul>
      )}

      <NovaLiteraturaForm processoId={processoId} documentos={documentos} />
    </div>
  );
}

function LiteraturaItem({
  item,
  processoId,
  documentos,
  arquivo,
}: {
  item: CasoLiteraturaUtilizadaRow;
  processoId: string;
  documentos: DocumentosRow[];
  arquivo: DocumentosRow | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarLiteraturaUtilizada(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir "${item.titulo}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirLiteraturaUtilizada(item.id, processoId);
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
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{item.titulo}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[
                item.tipo && TIPO_LITERATURA_ROTULOS[item.tipo],
                item.autor_entidade,
                item.ano,
                arquivo && `arquivo: ${arquivo.nome_arquivo}`,
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
          <label className={labelClass}>Título</label>
          <input name="titulo" defaultValue={item.titulo} className={inputClass} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Autor/entidade</label>
            <input name="autor_entidade" defaultValue={item.autor_entidade ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select name="tipo" defaultValue={item.tipo ?? ""} className={inputClass}>
              <option value="">— Não classificado —</option>
              {(Object.keys(TIPO_LITERATURA_ROTULOS) as (keyof typeof TIPO_LITERATURA_ROTULOS)[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LITERATURA_ROTULOS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ano</label>
            <input type="number" name="ano" defaultValue={item.ano ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Identificador/link</label>
          <input name="identificador_link" defaultValue={item.identificador_link ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tema</label>
            <input name="tema" defaultValue={item.tema ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Arquivo</label>
            <select name="arquivo_documento_id" defaultValue={item.arquivo_documento_id ?? ""} className={inputClass}>
              <option value="">— Nenhum —</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome_arquivo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Conceito relevante</label>
          <textarea name="conceito_relevante" rows={2} defaultValue={item.conceito_relevante ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ponto da análise em que foi usado</label>
          <textarea name="ponto_analise_utilizado" rows={2} defaultValue={item.ponto_analise_utilizado ?? ""} className={inputClass} />
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

function NovaLiteraturaForm({ processoId, documentos }: { processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarLiteraturaUtilizada(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-literatura-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-literatura-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar referência</h3>
      <div>
        <label className={labelClass}>Título</label>
        <input name="titulo" className={inputClass} required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Autor/entidade</label>
          <input name="autor_entidade" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tipo</label>
          <select name="tipo" className={inputClass} defaultValue="">
            <option value="">— Não classificado —</option>
            {(Object.keys(TIPO_LITERATURA_ROTULOS) as (keyof typeof TIPO_LITERATURA_ROTULOS)[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LITERATURA_ROTULOS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ano</label>
          <input type="number" name="ano" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Identificador/link</label>
        <input name="identificador_link" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tema</label>
          <input name="tema" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Arquivo</label>
          <select name="arquivo_documento_id" className={inputClass} defaultValue="">
            <option value="">— Nenhum —</option>
            {documentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_arquivo}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Conceito relevante</label>
        <textarea name="conceito_relevante" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ponto da análise em que foi usado</label>
        <textarea name="ponto_analise_utilizado" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
