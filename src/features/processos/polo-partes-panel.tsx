"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarParte, removerParte } from "./partes-actions";
import { Botao } from "@/components/ui/button";
import type { ProcessoPartesRow } from "@/types/database";

const PAPEIS_SUGERIDOS_ATIVO = ["Autor(a)", "Reclamante", "Requerente", "Curatelando(a)", "Segurado(a)"];
const PAPEIS_SUGERIDOS_PASSIVO = ["Réu(é)", "Reclamado(a)", "Requerido(a)", "Curatelado(a)", "INSS"];

const inputClass =
  "rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2.5 py-1.5 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

function BlocoPolo({
  processoId,
  titulo,
  polo,
  pessoas,
  papeisSugeridos,
}: {
  processoId: string;
  titulo: string;
  polo: "ativo" | "passivo";
  pessoas: ProcessoPartesRow[];
  papeisSugeridos: string[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function adicionar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await adicionarParte(processoId, polo, formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-pessoa-${polo}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  function remover(parteId: string) {
    setErro(null);
    startTransition(async () => {
      const resultado = await removerParte(parteId, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h3>

      {pessoas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma pessoa cadastrada ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {pessoas.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-nevoa-100 dark:border-nevoa-800 px-3 py-2 text-sm"
            >
              <span className="text-nevoa-900 dark:text-nevoa-100">
                <span className="text-nevoa-500 dark:text-nevoa-400">{p.papel}:</span> {p.nome}
              </span>
              <button
                type="button"
                onClick={() => remover(p.id)}
                disabled={isPending}
                aria-label={`Remover ${p.nome}`}
                title="Remover"
                className="text-vinho-600 hover:text-vinho-700 dark:text-vinho-400 disabled:opacity-30 shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form id={`form-nova-pessoa-${polo}`} action={adicionar} className="flex flex-wrap items-end gap-2">
        <datalist id={`papeis-sugeridos-${polo}`}>
          {papeisSugeridos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div>
          <label htmlFor={`papel-${polo}`} className="block text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">
            Papel
          </label>
          <input
            id={`papel-${polo}`}
            name="papel"
            list={`papeis-sugeridos-${polo}`}
            placeholder={papeisSugeridos[0]}
            className={`${inputClass} w-36`}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label htmlFor={`nome-${polo}`} className="block text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">
            Nome
          </label>
          <input id={`nome-${polo}`} name="nome" className={`${inputClass} w-full`} />
        </div>
        <Botao type="submit" variante="secundaria" carregando={isPending} textoCarregando="Adicionando…">
          Nova Pessoa
        </Botao>
      </form>
      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}

export function PoloPartesPanel({
  processoId,
  partes,
}: {
  processoId: string;
  partes: ProcessoPartesRow[];
}) {
  const ativo = partes.filter((p) => p.polo === "ativo");
  const passivo = partes.filter((p) => p.polo === "passivo");

  return (
    <div className="grid grid-cols-2 gap-4">
      <BlocoPolo
        processoId={processoId}
        titulo="Polo Ativo"
        polo="ativo"
        pessoas={ativo}
        papeisSugeridos={PAPEIS_SUGERIDOS_ATIVO}
      />
      <BlocoPolo
        processoId={processoId}
        titulo="Polo Passivo"
        polo="passivo"
        pessoas={passivo}
        papeisSugeridos={PAPEIS_SUGERIDOS_PASSIVO}
      />
    </div>
  );
}
