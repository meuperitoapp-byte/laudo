"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarComoReutilizavel } from "@/features/respostas-reutilizaveis/actions";
import type { RespostasReutilizaveisRow } from "@/types/database";

/**
 * "Usar resposta salva" / "Salvar como reutilizável", ao lado de um campo de
 * texto (texto_livre ou o Detalhamento de campos de seleção). `reutilizaveis`
 * já vem filtrado pra este campo específico (campo_id igual) + genéricas do
 * mesmo tipo_laudo — ver campo-field.tsx e a query em
 * app/(dashboard)/processos/[id]/preenchimento/[secaoId]/page.tsx.
 */
export function ReutilizavelControles({
  campoId,
  tipoLaudoId,
  reutilizaveis,
  valorAtual,
  onInserir,
}: {
  campoId: string;
  tipoLaudoId: string;
  reutilizaveis: RespostasReutilizaveisRow[];
  valorAtual: string;
  onInserir: (conteudo: string) => void;
}) {
  const router = useRouter();
  const [listaAberta, setListaAberta] = useState(false);
  const [salvandoComo, setSalvandoComo] = useState(false);
  const [tituloNovo, setTituloNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar() {
    if (!tituloNovo.trim()) {
      setErro("Dê um título.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await salvarComoReutilizavel({
        campoId,
        tipoLaudoId,
        titulo: tituloNovo,
        conteudo: valorAtual,
      });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setSalvandoComo(false);
      setTituloNovo("");
      router.refresh();
    });
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setListaAberta((v) => !v)}
          disabled={reutilizaveis.length === 0}
          className="text-petroleo-600 hover:underline dark:text-petroleo-400 disabled:opacity-30 disabled:no-underline disabled:text-nevoa-400 dark:disabled:text-nevoa-600"
        >
          Usar resposta salva{reutilizaveis.length > 0 ? ` (${reutilizaveis.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setSalvandoComo((v) => !v)}
          disabled={!valorAtual.trim()}
          className="text-petroleo-600 hover:underline dark:text-petroleo-400 disabled:opacity-30 disabled:no-underline disabled:text-nevoa-400 dark:disabled:text-nevoa-600"
        >
          Salvar como reutilizável
        </button>
      </div>

      {listaAberta && (
        <div className="mt-1 rounded-md border border-nevoa-300 dark:border-nevoa-700 divide-y divide-nevoa-100 dark:divide-nevoa-800 max-h-48 overflow-y-auto">
          {reutilizaveis.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onInserir(r.conteudo);
                setListaAberta(false);
              }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
            >
              <span className="font-medium text-nevoa-900 dark:text-nevoa-100">{r.titulo}</span>
              <span className="block text-nevoa-500 dark:text-nevoa-400 truncate">{r.conteudo}</span>
            </button>
          ))}
        </div>
      )}

      {salvandoComo && (
        <div className="mt-1 flex items-center gap-2">
          <input
            value={tituloNovo}
            onChange={(e) => setTituloNovo(e.target.value)}
            placeholder="Título dessa resposta"
            className="flex-1 rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-xs text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={isPending}
            className="shrink-0 rounded-md bg-petroleo-600 text-white hover:bg-petroleo-700 dark:bg-petroleo-400 dark:text-nevoa-900 dark:hover:bg-petroleo-500 px-2.5 py-1 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
    </div>
  );
}
