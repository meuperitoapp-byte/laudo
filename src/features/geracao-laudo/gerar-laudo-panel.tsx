"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarLaudo } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export interface VersaoLaudo {
  id: string;
  versao: number;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
}

export function GerarLaudoPanel({
  processoId,
  podeGerar,
  versoes,
}: {
  processoId: string;
  podeGerar: boolean;
  versoes: VersaoLaudo[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarLaudo(processoId);
      if ("error" in resultado) {
        setToast({ tipo: "erro", texto: resultado.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Versão ${resultado.versao} gerada.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Botao onClick={gerar} disabled={!podeGerar} carregando={isPending} textoCarregando="Gerando…">
          Gerar novo laudo
        </Botao>
      </div>

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">Versões geradas</h2>
        {versoes.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma versão gerada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-nevoa-900 dark:text-nevoa-100">Versão {v.versao}</span>
                  <span className="text-nevoa-500 dark:text-nevoa-400 ml-2">
                    {new Date(v.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex gap-4">
                  {v.urlPdf && (
                    <a
                      href={v.urlPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      PDF
                    </a>
                  )}
                  {v.urlDocx && (
                    <a
                      href={v.urlDocx}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
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
