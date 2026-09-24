"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export interface VersaoDocumentoGerado {
  id: string;
  versao: number;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/**
 * Geração de PDF/Word genérica — mesmo padrão repetido em Atestado, Análise
 * de Viabilidade etc. (botão "Gerar" + lista de versões com link PDF/Word).
 * Extraído aqui pro lote PERICONS 24/09/2026 (Réplica, Quesitos, Relatório
 * Técnico, Estratégia Pericial) não duplicar o mesmo componente 4x.
 */
export function GerarDocumentoPanel({
  gerar,
  versoes,
}: {
  gerar: () => Promise<{ error: string } | { success: true; versao: number }>;
  versoes: VersaoDocumentoGerado[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function acionar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerar();
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
      <Botao onClick={acionar} carregando={isPending} textoCarregando="Gerando…">
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
