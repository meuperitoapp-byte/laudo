"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumento } from "@/features/documentos/actions";
import { salvarAnaliseContestacaoObservacoes } from "@/features/processos/actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { EtapaContratada } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

export interface DocumentoEtapaAt {
  id: string;
  nomeArquivo: string;
  signedUrl: string | null;
}

/**
 * Anexo de arquivo por etapa de Assistência Técnica — item 2 do lote
 * pós-Fase-2 (21/09/2026), hoje usado só pela etapa "Análise da
 * contestação" (o arquivo que o advogado manda). Reaproveita a mesma
 * infraestrutura de upload/Storage da tela de Documentos (`uploadDocumento`,
 * bucket `documentos-processos`) — só marca `etapa_at` no envio, pra
 * aparecer aqui além de aparecer na lista geral de Documentos do processo.
 */
export function AnexoEtapaAtPanel({
  processoId,
  etapa,
  tituloEtapa,
  documentos,
  observacoes,
}: {
  processoId: string;
  etapa: EtapaContratada;
  tituloEtapa: string;
  documentos: DocumentoEtapaAt[];
  /** Campo pra digitalizar as informações identificadas ao estudar a etapa — hoje só usado pela Análise da contestação (24/09/2026). `undefined` esconde o campo. */
  observacoes?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [texto, setTexto] = useState(observacoes ?? "");
  const [salvandoObs, setSalvandoObs] = useState(false);

  async function salvarObservacoes() {
    setSalvandoObs(true);
    const r = await salvarAnaliseContestacaoObservacoes(processoId, texto.trim() || null);
    setSalvandoObs(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Anotações salvas." });
    router.refresh();
  }

  async function enviar(formData: FormData) {
    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setMensagem({ tipo: "erro", texto: "Selecione um arquivo." });
      return;
    }
    formData.set("tipo", "documento_processual");
    formData.set("etapa_at", etapa);

    setIsPending(true);
    const r = await uploadDocumento(processoId, formData);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Arquivo enviado." });
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div
      id={etapa === "analise_contestacao" ? "analise-contestacao" : undefined}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4 scroll-mt-20"
    >
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Anexo — {tituloEtapa}
      </h3>

      {observacoes !== undefined && (
        <div>
          <label htmlFor="analise_contestacao_observacoes" className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
            Anotações — o que você identificou ao estudar a contestação
          </label>
          <textarea
            id="analise_contestacao_observacoes"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={salvarObservacoes}
            rows={4}
            className={inputClass}
          />
          {salvandoObs && <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mt-1">Salvando…</p>}
        </div>
      )}

      {documentos.length > 0 && (
        <ul className="space-y-1.5">
          {documentos.map((d) => (
            <li key={d.id} className="text-sm">
              {d.signedUrl ? (
                <a
                  href={d.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-petroleo-600 hover:underline dark:text-petroleo-400 break-all"
                >
                  {d.nomeArquivo}
                </a>
              ) : (
                <span className="text-nevoa-700 dark:text-nevoa-300 break-all">{d.nomeArquivo}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={enviar} className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name="arquivo"
          required
          className="text-sm text-nevoa-700 dark:text-nevoa-300"
        />
        <Botao type="submit" variante="secundaria" disabled={isPending} carregando={isPending} textoCarregando="Enviando…">
          Anexar arquivo
        </Botao>
      </form>
      <p className="text-xs text-nevoa-400 dark:text-nevoa-600">
        Também aparece na lista geral de Documentos do processo.
      </p>

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
