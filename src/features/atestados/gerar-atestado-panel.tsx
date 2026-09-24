"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarAtestadoPdf } from "./gerar-pdf-actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AtestadoTipoDocumento } from "@/types/enums";

export interface VersaoAtestado {
  id: string;
  versao: number;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Geração do PDF/Word do Atestado/Declaração — mesmo padrão de GerarAnaliseViabilidadePanel. */
export function GerarAtestadoPanel({
  processoId,
  atestadoId,
  tipoDocumento,
  versoes,
}: {
  processoId: string;
  atestadoId: string;
  tipoDocumento: AtestadoTipoDocumento;
  versoes: VersaoAtestado[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarAtestadoPdf(processoId, atestadoId, tipoDocumento);
      if ("error" in resultado) {
        setToast({ tipo: "erro", texto: resultado.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Versão ${resultado.versao} gerada.` });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <Botao onClick={gerar} carregando={isPending} textoCarregando="Gerando…">
        Gerar PDF/Word
      </Botao>

      <div>
        <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300 mb-2">Versões geradas</h3>
        {versoes.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma versão gerada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-nevoa-900 dark:text-nevoa-100">Versão {v.versao}</span>
                  <span className="text-nevoa-500 dark:text-nevoa-400">{dataHora(v.criadoEm)}</span>
                </div>
                <div className="flex items-center gap-4">
                  {v.urlPdf && (
                    <a href={v.urlPdf} target="_blank" rel="noopener noreferrer" className="text-petroleo-600 hover:underline dark:text-petroleo-400">
                      PDF
                    </a>
                  )}
                  {v.urlDocx && (
                    <a href={v.urlDocx} target="_blank" rel="noopener noreferrer" className="text-petroleo-600 hover:underline dark:text-petroleo-400">
                      Word
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && <Toast tipo={toast.tipo} texto={toast.texto} onClose={() => setToast(null)} />}
    </div>
  );
}
