"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarDocumento, excluirDocumento, moverDocumento, uploadDocumento } from "./actions";
import { CATEGORIAS_SUGERIDAS, TAMANHO_MAXIMO_BYTES } from "./constants";
import { Botao, classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { DocumentosRow } from "@/types/database";
import type { TipoDocumento } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";
const botaoIconeClass =
  "rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 w-7 h-7 disabled:opacity-30";

const TIPO_ROTULOS: Record<string, string> = {
  documento_processual: "Documento processual",
  imagem_pericia: "Imagem da perícia",
};

function iconePara(mime: string | null): string {
  if (!mime) return "📎";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Vínculo com o Módulo Pós-Laudo, quando o documento foi cadastrado por lá. */
export interface PosLaudoVinculo {
  papel: string;
  numeroCiclo: number;
}
const POS_LAUDO_PAPEL_ROTULOS: Record<string, string> = {
  superveniente: "Superveniente",
  laudo_analisado: "Laudo analisado",
  manifestacao_analisada: "Manifestação analisada",
};

export type DocumentoComUrl = DocumentosRow & {
  signedUrl: string | null;
  posLaudo?: PosLaudoVinculo | null;
};

export function DocumentosPanel({
  processoId,
  documentos,
}: {
  processoId: string;
  documentos: DocumentoComUrl[];
}) {
  return (
    <div className="space-y-8 max-w-3xl">
      {documentos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum documento enviado ainda.</p>
      ) : (
        <ol className="space-y-3">
          {documentos.map((documento, index) => (
            <DocumentoCard
              key={documento.id}
              processoId={processoId}
              documento={documento}
              primeiro={index === 0}
              ultimo={index === documentos.length - 1}
            />
          ))}
        </ol>
      )}

      <UploadForm processoId={processoId} />
    </div>
  );
}

function DocumentoCard({
  processoId,
  documento,
  primeiro,
  ultimo,
}: {
  processoId: string;
  documento: DocumentoComUrl;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<TipoDocumento>(documento.tipo);
  const [categoria, setCategoria] = useState(documento.categoria ?? "");
  const [origemProfissional, setOrigemProfissional] = useState(documento.origem_profissional ?? "");
  const [dataDocumento, setDataDocumento] = useState(documento.data_documento ?? "");
  const [paginas, setPaginas] = useState(documento.paginas?.toString() ?? "");
  const [ilegivel, setIlegivel] = useState(documento.ilegivel_insuficiente);
  const [observacao, setObservacao] = useState(documento.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ehImagem = documento.mime_type?.startsWith("image/") ?? false;

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarDocumento({
        documentoId: documento.id,
        processoId,
        tipo,
        categoria: categoria || null,
        origemProfissional: origemProfissional || null,
        dataDocumento: dataDocumento || null,
        paginas: paginas.trim() ? Number(paginas) : null,
        ilegivelInsuficiente: ilegivel,
        observacao: observacao || null,
      });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function mover(direcao: "cima" | "baixo") {
    setErro(null);
    startTransition(async () => {
      const resultado = await moverDocumento({ processoId, documentoId: documento.id, direcao });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (documento.posLaudo) {
      setErro(
        `Este documento está vinculado ao ciclo de pós-laudo ${documento.posLaudo.numeroCiclo}. Remova por lá (tela do ciclo → Documentos supervenientes).`,
      );
      return;
    }
    if (!window.confirm(`Excluir "${documento.nome_arquivo}"? Remove do processo e do armazenamento — não tem como desfazer.`)) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirDocumento(documento.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {ehImagem && documento.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- vem de signed URL do Storage, não é um asset local pra otimizar
            <img
              src={documento.signedUrl}
              alt={documento.nome_arquivo}
              className="w-16 h-16 object-cover rounded-md border border-nevoa-200 dark:border-nevoa-800"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center rounded-md border border-nevoa-200 dark:border-nevoa-800 text-2xl">
              {iconePara(documento.mime_type)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100 truncate">{documento.nome_arquivo}</p>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
                {TIPO_ROTULOS[documento.tipo] ?? documento.tipo}
                {documento.categoria && ` · ${documento.categoria}`}
                {documento.tamanho_bytes ? ` · ${formatarTamanho(documento.tamanho_bytes)}` : ""}
              </p>
              {(documento.origem_profissional || documento.data_documento || documento.paginas) && (
                <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
                  {[
                    documento.origem_profissional,
                    documento.data_documento,
                    documento.paginas ? `${documento.paginas} pág.` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {documento.signedUrl && (
                <a
                  href={documento.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao("secundaria", "px-2! py-1! text-xs!")}
                >
                  Abrir
                </a>
              )}
              <button type="button" onClick={() => setEditando((v) => !v)} className={classesBotao("secundaria", "px-2! py-1! text-xs!")}>
                {editando ? "Fechar" : "Editar"}
              </button>
              <button
                type="button"
                onClick={() => mover("cima")}
                disabled={primeiro || isPending}
                title="Mover para cima"
                aria-label="Mover documento para cima"
                className={botaoIconeClass}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => mover("baixo")}
                disabled={ultimo || isPending}
                title="Mover para baixo"
                aria-label="Mover documento para baixo"
                className={botaoIconeClass}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={excluir}
                disabled={isPending}
                title="Excluir documento"
                aria-label="Excluir documento"
                className="rounded-md border border-nevoa-300 dark:border-nevoa-700 w-7 h-7 text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          </div>

          {documento.posLaudo && (
            <div className="mt-1.5">
              <Selo variante="neutro">
                {POS_LAUDO_PAPEL_ROTULOS[documento.posLaudo.papel] ?? documento.posLaudo.papel} · pós-laudo
                ciclo {documento.posLaudo.numeroCiclo}
              </Selo>
            </div>
          )}

          {documento.ilegivel_insuficiente && (
            <div className="mt-1.5">
              <Selo variante="atencao">
                Ilegível/insuficiente{documento.observacao ? `: ${documento.observacao}` : " — sem observação justificando"}
              </Selo>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <div className="mt-3 pt-3 border-t border-nevoa-200 dark:border-nevoa-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} className={inputClass}>
                <option value="documento_processual">Documento processual</option>
                <option value="imagem_pericia">Imagem da perícia</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Categoria</label>
              <input
                list="categorias-sugeridas"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Origem profissional</label>
              <input value={origemProfissional} onChange={(e) => setOrigemProfissional(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Páginas</label>
              <input type="number" min={0} value={paginas} onChange={(e) => setPaginas(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Data do documento</label>
            <input type="date" value={dataDocumento} onChange={(e) => setDataDocumento(e.target.value)} className={inputClass} />
          </div>

          <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
            <input type="checkbox" checked={ilegivel} onChange={(e) => setIlegivel(e.target.checked)} className="accent-petroleo-600" />
            Ilegível/insuficiente
          </label>

          {ilegivel && (
            <div>
              <label className={labelClass}>Observação (justificativa)</label>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className={inputClass} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Botao onClick={salvar} carregando={isPending} textoCarregando="Salvando…">
              Salvar
            </Botao>
            {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

function UploadForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoDocumento>("documento_processual");
  const [ilegivel, setIlegivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Selecione um arquivo.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErro("Arquivo maior que 25MB — não é possível enviar.");
      return;
    }
    startTransition(async () => {
      const resultado = await uploadDocumento(processoId, formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-upload-documento") as HTMLFormElement | null)?.reset();
      setIlegivel(false);
      router.refresh();
    });
  }

  return (
    <form
      id="form-upload-documento"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3"
    >
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Enviar documento</h2>

      <datalist id="categorias-sugeridas">
        {CATEGORIAS_SUGERIDAS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div>
        <label htmlFor="arquivo" className={labelClass}>
          Arquivo
        </label>
        <input id="arquivo" name="arquivo" type="file" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Tipo</label>
        <div className="flex gap-4 text-sm text-nevoa-800 dark:text-nevoa-200">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="tipo"
              value="documento_processual"
              checked={tipo === "documento_processual"}
              onChange={() => setTipo("documento_processual")}
              className="accent-petroleo-600"
            />
            Documento processual
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="tipo"
              value="imagem_pericia"
              checked={tipo === "imagem_pericia"}
              onChange={() => setTipo("imagem_pericia")}
              className="accent-petroleo-600"
            />
            Imagem da perícia
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="categoria" className={labelClass}>
            Categoria
          </label>
          <input id="categoria" name="categoria" list="categorias-sugeridas" className={inputClass} />
        </div>
        <div>
          <label htmlFor="origem_profissional" className={labelClass}>
            Origem profissional
          </label>
          <input id="origem_profissional" name="origem_profissional" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="data_documento" className={labelClass}>
            Data do documento
          </label>
          <input id="data_documento" name="data_documento" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="paginas" className={labelClass}>
            Páginas
          </label>
          <input id="paginas" name="paginas" type="number" min={0} className={inputClass} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
        <input
          type="checkbox"
          name="ilegivel_insuficiente"
          checked={ilegivel}
          onChange={(e) => setIlegivel(e.target.checked)}
          className="accent-petroleo-600"
        />
        Ilegível/insuficiente
      </label>

      {ilegivel && (
        <div>
          <label htmlFor="observacao" className={labelClass}>
            Observação (justificativa)
          </label>
          <textarea id="observacao" name="observacao" rows={2} className={inputClass} />
        </div>
      )}

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Enviando…">
        Enviar documento
      </Botao>
    </form>
  );
}
