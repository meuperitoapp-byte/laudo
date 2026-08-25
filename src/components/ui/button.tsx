import type { ButtonHTMLAttributes } from "react";

/**
 * Botão de apresentação compartilhado — camada visual só (nenhuma lógica de
 * negócio aqui). 4 variantes cobrindo o pedido de hierarquia de ação:
 * primária (Salvar, Criar processo, Gerar laudo), secundária (Cancelar,
 * Voltar), perigo (confirmar exclusão) e perigo-fantasma (abrir a intenção
 * de excluir, sem already ser tão forte quanto a confirmação).
 *
 * `carregando` cobre o pedido de indicador de carregamento em upload/geração
 * de laudo — desabilita o botão e troca o conteúdo por um spinner + texto.
 */

type Variante = "primaria" | "secundaria" | "perigo" | "perigo-fantasma";

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  textoCarregando?: string;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold px-4 py-2 transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petroleo-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "bg-petroleo-600 text-white hover:bg-petroleo-700 " +
    "dark:bg-petroleo-400 dark:text-nevoa-900 dark:hover:bg-petroleo-500",
  secundaria:
    "bg-transparent text-nevoa-600 border border-nevoa-300 hover:bg-nevoa-50 hover:text-nevoa-900 " +
    "dark:text-nevoa-400 dark:border-nevoa-700 dark:hover:bg-nevoa-800 dark:hover:text-nevoa-100",
  perigo: "bg-vinho-600 text-white hover:bg-vinho-700",
  "perigo-fantasma":
    "bg-transparent text-vinho-600 hover:bg-vinho-100 " + "dark:text-vinho-400 dark:hover:bg-vinho-950",
};

/** Pras poucas vezes que a "ação" é navegação (`<Link>`), não submit — mesmo visual do <Botao>. */
export function classesBotao(variante: Variante = "primaria", className = ""): string {
  return `${BASE} ${VARIANTES[variante]} ${className}`;
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Botao({
  variante = "primaria",
  carregando = false,
  textoCarregando,
  disabled,
  children,
  className = "",
  ...props
}: BotaoProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || carregando}
      className={`${BASE} ${VARIANTES[variante]} ${className}`}
    >
      {carregando && <Spinner />}
      {carregando ? (textoCarregando ?? children) : children}
    </button>
  );
}
