"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { avaliarDocumento, salvarSuficienciaDocumental } from "./actions";
import { SUFICIENCIA_DOCUMENTAL_ROTULOS, RELEVANCIA_DOCUMENTO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { AnalisesViabilidadeRow, CasoDocumentosAvaliadosRow, DocumentosRow } from "@/types/database";
import type { ViabilidadeSuficienciaDocumental } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const SUFICIENCIA_OPCOES: ViabilidadeSuficienciaDocumental[] = ["sim", "parcialmente", "nao"];

/**
 * Acervo documental (§7) + Suficiência documental (§8). Puxa documentos já
 * cadastrados no CASO (`documentos`), sem base documental nova — só a
 * AVALIAÇÃO nesta análise (utilizado?/relevância/observação) é gravada
 * aqui, em `caso_documentos_avaliados`.
 */
export function AcervoDocumentalPanel({
  analise,
  documentos,
  avaliacoes,
}: {
  analise: AnalisesViabilidadeRow;
  documentos: DocumentosRow[];
  avaliacoes: CasoDocumentosAvaliadosRow[];
}) {
  const avaliacaoPorDocumento = new Map(avaliacoes.map((a) => [a.documento_id, a]));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-5">
      <SuficienciaDocumentalForm analise={analise} />

      <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Acervo documental</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5 mb-3">
          Documentos já cadastrados no processo — avalie relevância e uso nesta análise.
        </p>
        {documentos.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
            Nenhum documento cadastrado no processo ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {documentos.map((d) => (
              <DocumentoAvaliavel key={d.id} documento={d} avaliacao={avaliacaoPorDocumento.get(d.id) ?? null} processoId={analise.processo_id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SuficienciaDocumentalForm({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await salvarSuficienciaDocumental(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={salvar} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="analise_id" value={analise.id} />
      <input type="hidden" name="processo_id" value={analise.processo_id} />
      <div className="max-w-xs">
        <label htmlFor="suficiencia_documental" className={labelClass}>
          O acervo disponível é suficiente para análise tecnicamente segura?
        </label>
        <select
          id="suficiencia_documental"
          name="suficiencia_documental"
          defaultValue={analise.suficiencia_documental ?? ""}
          className={inputClass}
        >
          <option value="">— Ainda não respondido —</option>
          {SUFICIENCIA_OPCOES.map((s) => (
            <option key={s} value={s}>
              {SUFICIENCIA_DOCUMENTAL_ROTULOS[s]}
            </option>
          ))}
        </select>
      </div>
      <Botao type="submit" variante="secundaria" carregando={isPending} textoCarregando="Salvando…">
        Salvar
      </Botao>
      {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      <p className="text-xs text-nevoa-400 dark:text-nevoa-600 basis-full">
        Parcialmente/Não sinalizam que falta documento — mas a lista de Documentos faltantes abaixo continua
        disponível mesmo respondendo Sim (pode valer pedir um complementar).
      </p>
    </form>
  );
}

function DocumentoAvaliavel({
  documento,
  avaliacao,
  processoId,
}: {
  documento: DocumentosRow;
  avaliacao: CasoDocumentosAvaliadosRow | null;
  processoId: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await avaliarDocumento(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200 truncate">{documento.nome_arquivo}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[documento.categoria, documento.data_documento].filter(Boolean).join(" · ") || "Sem categoria/data"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {avaliacao ? (
              <Selo variante={avaliacao.utilizado ? "sucesso" : "neutro"}>
                {avaliacao.utilizado ? "Utilizado" : "Não utilizado"}
                {avaliacao.relevancia ? ` · ${RELEVANCIA_DOCUMENTO_ROTULOS[avaliacao.relevancia]}` : ""}
              </Selo>
            ) : (
              <span className="text-xs text-nevoa-400 dark:text-nevoa-600">Ainda não avaliado</span>
            )}
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs"
            >
              Avaliar
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="processo_id" value={processoId} />
        <input type="hidden" name="documento_id" value={documento.id} />
        <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100">{documento.nome_arquivo}</p>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input type="checkbox" name="utilizado" defaultChecked={avaliacao?.utilizado ?? true} className="accent-petroleo-600" />
          Utilizado nesta análise
        </label>
        <div>
          <label className={labelClass}>Relevância</label>
          <select name="relevancia" defaultValue={avaliacao?.relevancia ?? ""} className={inputClass}>
            <option value="">— Não classificado —</option>
            {(Object.keys(RELEVANCIA_DOCUMENTO_ROTULOS) as (keyof typeof RELEVANCIA_DOCUMENTO_ROTULOS)[]).map((r) => (
              <option key={r} value={r}>
                {RELEVANCIA_DOCUMENTO_ROTULOS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Observação técnica</label>
          <textarea name="observacao_tecnica" rows={2} defaultValue={avaliacao?.observacao_tecnica ?? ""} className={inputClass} />
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
