"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarLaudo } from "./actions";

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
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function gerar() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = await gerarLaudo(processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setMensagem(`Versão ${resultado.versao} gerada.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={gerar}
          disabled={!podeGerar || isPending}
          className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm disabled:opacity-40"
        >
          {isPending ? "Gerando…" : "Gerar novo laudo"}
        </button>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
        {mensagem && <p className="text-sm text-zinc-500 mt-2">{mensagem}</p>}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Versões geradas</h2>
        {versoes.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma versão gerada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">Versão {v.versao}</span>
                  <span className="text-zinc-500 ml-2">
                    {new Date(v.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex gap-4">
                  {v.urlPdf && (
                    <a href={v.urlPdf} target="_blank" rel="noopener noreferrer" className="underline">
                      PDF
                    </a>
                  )}
                  {v.urlDocx && (
                    <a href={v.urlDocx} target="_blank" rel="noopener noreferrer" className="underline">
                      Word
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
