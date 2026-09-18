"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumento } from "@/features/documentos/actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { EtapaContratada } from "@/types/enums";

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
}: {
  processoId: string;
  etapa: EtapaContratada;
  tituloEtapa: string;
  documentos: DocumentoEtapaAt[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

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
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Anexo — {tituloEtapa}
      </h3>

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
