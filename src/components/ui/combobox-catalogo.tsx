"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Campo de texto livre com sugestões pesquisáveis + opção de cadastrar um
 * valor novo na hora ("+ Nova vara", "+ Nova comarca") — pedido da Dra.
 * Fernanda pra Vara/Comarca, mas genérico o bastante pra qualquer campo de
 * texto que deva crescer como catálogo (ex.: um Status novo no futuro).
 *
 * Continua sendo, na prática, um <input type="text"> comum pro form: o valor
 * digitado/selecionado é sempre o próprio texto (sem id de catálogo à parte,
 * sem tabela nova) — as `sugestoes` vêm de fora (normalmente os valores
 * distintos já usados em processos anteriores), então o catálogo cresce
 * sozinho conforme a perita cadastra processos, sem precisar de tela de
 * administração.
 */
export function ComboboxCatalogo({
  name,
  id,
  sugestoes,
  valorInicial = "",
  placeholder,
  rotuloNovo = "Novo item",
  className = "",
  required,
}: {
  name: string;
  id?: string;
  sugestoes: string[];
  valorInicial?: string;
  placeholder?: string;
  /** Rótulo usado na linha "+ {rotuloNovo}: ..." — ex.: "Nova vara", "Nova comarca". */
  rotuloNovo?: string;
  className?: string;
  required?: boolean;
}) {
  const inputId = useId();
  const [valor, setValor] = useState(valorInicial);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const termo = valor.trim().toLowerCase();
  const filtradas = termo
    ? sugestoes.filter((s) => s.toLowerCase().includes(termo) && s.toLowerCase() !== termo)
    : sugestoes;
  const existeExato = sugestoes.some((s) => s.toLowerCase() === termo);
  const mostrarAdicionar = termo.length > 0 && !existeExato;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id ?? inputId}
        name={name}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={
          className ||
          "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
        }
      />
      {aberto && (filtradas.length > 0 || mostrarAdicionar) && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900 shadow-lg">
          {filtradas.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValor(s);
                setAberto(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-nevoa-800 dark:text-nevoa-200 hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
            >
              {s}
            </button>
          ))}
          {mostrarAdicionar && (
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="block w-full text-left px-3 py-2 text-sm text-petroleo-600 dark:text-petroleo-400 border-t border-nevoa-200 dark:border-nevoa-800 hover:bg-petroleo-100 dark:hover:bg-petroleo-950/40"
            >
              + {rotuloNovo}: “{valor.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
