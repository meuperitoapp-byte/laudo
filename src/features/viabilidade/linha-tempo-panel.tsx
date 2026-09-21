"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarEventoLinhaTempo, criarEventoLinhaTempo, excluirEventoLinhaTempo } from "./actions";
import { CATEGORIA_LINHA_TEMPO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import type { CasoLinhaTempoMedicaRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function OpcoesDocumentos({ documentos }: { documentos: DocumentosRow[] }) {
  return (
    <>
      <option value="">— Nenhum —</option>
      {documentos.map((d) => (
        <option key={d.id} value={d.id}>
          {d.nome_arquivo}
        </option>
      ))}
    </>
  );
}

/** Linha do tempo médico-pericial (§11) — entidade do CASO, reutilizada por Estratégia/Preparação/Parecer/Relatório quando existirem (§40). */
export function LinhaTempoPanel({
  processoId,
  itens,
  documentos,
}: {
  processoId: string;
  itens: CasoLinhaTempoMedicaRow[];
  documentos: DocumentosRow[];
}) {
  const ordenados = [...itens].sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? "").localeCompare(b.hora ?? ""));
  const documentoPorId = new Map(documentos.map((d) => [d.id, d]));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Linha do tempo médico-pericial</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">§11 — cronologia do caso.</p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum evento cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <EventoLinhaTempoItem
              key={item.id}
              item={item}
              processoId={processoId}
              documentos={documentos}
              documento={item.documento_id ? (documentoPorId.get(item.documento_id) ?? null) : null}
            />
          ))}
        </ul>
      )}

      <NovoEventoLinhaTempoForm processoId={processoId} documentos={documentos} />
    </div>
  );
}

function EventoLinhaTempoItem({
  item,
  processoId,
  documentos,
  documento,
}: {
  item: CasoLinhaTempoMedicaRow;
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
      const resultado = await atualizarEventoLinhaTempo(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir o evento "${item.evento}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirEventoLinhaTempo(item.id, processoId);
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
              {item.marco_critico && <span className="text-vinho-600 dark:text-vinho-400">● </span>}
              {dataCurta(item.data)}
              {item.hora ? ` ${item.hora}` : ""} — {item.evento}
            </p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[
                item.categoria && CATEGORIA_LINHA_TEMPO_ROTULOS[item.categoria],
                documento && `doc.: ${documento.nome_arquivo}`,
                item.relevancia,
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
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" name="data" defaultValue={item.data} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Hora (opcional)</label>
            <input type="time" name="hora" defaultValue={item.hora ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <select name="categoria" defaultValue={item.categoria ?? ""} className={inputClass}>
              <option value="">— Nenhuma —</option>
              {(Object.keys(CATEGORIA_LINHA_TEMPO_ROTULOS) as (keyof typeof CATEGORIA_LINHA_TEMPO_ROTULOS)[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LINHA_TEMPO_ROTULOS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Evento</label>
          <textarea name="evento" rows={2} defaultValue={item.evento} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Documento fonte</label>
            <select name="documento_id" defaultValue={item.documento_id ?? ""} className={inputClass}>
              <OpcoesDocumentos documentos={documentos} />
            </select>
          </div>
          <div>
            <label className={labelClass}>Página/ID</label>
            <input name="pagina_ref" defaultValue={item.pagina_ref ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Relevância</label>
          <input name="relevancia" defaultValue={item.relevancia ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Observação técnica</label>
          <textarea name="observacao_tecnica" rows={2} defaultValue={item.observacao_tecnica ?? ""} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input type="checkbox" name="marco_critico" defaultChecked={item.marco_critico} className="accent-petroleo-600" />
          Marco crítico
        </label>
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

function NovoEventoLinhaTempoForm({ processoId, documentos }: { processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarEventoLinhaTempo(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-novo-evento-linha-tempo-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-novo-evento-linha-tempo-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar evento</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Data</label>
          <input type="date" name="data" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Hora (opcional)</label>
          <input type="time" name="hora" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Categoria</label>
          <select name="categoria" className={inputClass} defaultValue="">
            <option value="">— Nenhuma —</option>
            {(Object.keys(CATEGORIA_LINHA_TEMPO_ROTULOS) as (keyof typeof CATEGORIA_LINHA_TEMPO_ROTULOS)[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LINHA_TEMPO_ROTULOS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Evento</label>
        <textarea name="evento" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Documento fonte</label>
          <select name="documento_id" className={inputClass} defaultValue="">
            <OpcoesDocumentos documentos={documentos} />
          </select>
        </div>
        <div>
          <label className={labelClass}>Página/ID</label>
          <input name="pagina_ref" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Relevância</label>
        <input name="relevancia" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Observação técnica</label>
        <textarea name="observacao_tecnica" rows={2} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
        <input type="checkbox" name="marco_critico" className="accent-petroleo-600" />
        Marco crítico
      </label>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
