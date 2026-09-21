"use client";

import { useId, useState } from "react";

/**
 * Campo de múltiplos valores com sugestões — mesmo princípio do
 * ComboboxCatalogo (texto livre, catálogo cresce pelo uso), mas pra campos
 * multisseleção (ex.: Matéria, Tags técnicas da Análise de Viabilidade).
 * Cada valor selecionado vira um input hidden com o mesmo `name` — um
 * `<form>` em volta lê todos via `formData.getAll(name)`.
 */
export function TagsCatalogo({
  name,
  id,
  sugestoes,
  valoresIniciais = [],
  placeholder,
  rotuloNovo = "Novo item",
}: {
  name: string;
  id?: string;
  sugestoes: string[];
  valoresIniciais?: string[];
  placeholder?: string;
  rotuloNovo?: string;
}) {
  const inputId = useId();
  const [valores, setValores] = useState<string[]>(valoresIniciais);
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);

  function adicionar(valor: string) {
    const limpo = valor.trim();
    if (!limpo) return;
    if (!valores.some((v) => v.toLowerCase() === limpo.toLowerCase())) {
      setValores((prev) => [...prev, limpo]);
    }
    setTexto("");
    setAberto(false);
  }

  function remover(valor: string) {
    setValores((prev) => prev.filter((v) => v !== valor));
  }

  const termo = texto.trim().toLowerCase();
  const filtradas = sugestoes.filter(
    (s) => !valores.some((v) => v.toLowerCase() === s.toLowerCase()) && (!termo || s.toLowerCase().includes(termo)),
  );
  const existeExato = sugestoes.some((s) => s.toLowerCase() === termo) || valores.some((v) => v.toLowerCase() === termo);
  const mostrarAdicionar = termo.length > 0 && !existeExato;

  return (
    <div className="space-y-2">
      {valores.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {valores.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {valores.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full bg-petroleo-100 dark:bg-petroleo-950/60 text-petroleo-700 dark:text-petroleo-300 pl-2.5 pr-1.5 py-1 text-xs"
            >
              {v}
              <button
                type="button"
                onClick={() => remover(v)}
                aria-label={`Remover ${v}`}
                className="rounded-full hover:bg-petroleo-200 dark:hover:bg-petroleo-900 h-4 w-4 flex items-center justify-center"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          id={id ?? inputId}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionar(texto);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
        />
        {aberto && (filtradas.length > 0 || mostrarAdicionar) && (
          <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900 shadow-lg">
            {filtradas.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => adicionar(s)}
                className="block w-full text-left px-3 py-2 text-sm text-nevoa-800 dark:text-nevoa-200 hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
              >
                {s}
              </button>
            ))}
            {mostrarAdicionar && (
              <button
                type="button"
                onClick={() => adicionar(texto)}
                className="block w-full text-left px-3 py-2 text-sm text-petroleo-600 dark:text-petroleo-400 border-t border-nevoa-200 dark:border-nevoa-800 hover:bg-petroleo-100 dark:hover:bg-petroleo-950/40"
              >
                + {rotuloNovo}: &ldquo;{texto.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
