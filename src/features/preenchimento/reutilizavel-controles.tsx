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
          className="underline text-zinc-500 disabled:opacity-30 disabled:no-underline"
        >
          Usar resposta salva{reutilizaveis.length > 0 ? ` (${reutilizaveis.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setSalvandoComo((v) => !v)}
          disabled={!valorAtual.trim()}
          className="underline text-zinc-500 disabled:opacity-30 disabled:no-underline"
        >
          Salvar como reutilizável
        </button>
      </div>

      {listaAberta && (
        <div className="mt-1 rounded border border-zinc-300 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-48 overflow-y-auto">
          {reutilizaveis.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onInserir(r.conteudo);
                setListaAberta(false);
              }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="font-medium">{r.titulo}</span>
              <span className="block text-zinc-500 truncate">{r.conteudo}</span>
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
            className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={isPending}
            className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-1 text-xs disabled:opacity-40 shrink-0"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  );
}
