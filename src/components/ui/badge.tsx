import type { ReactNode } from "react";

/**
 * Indicador de estado compartilhado (sucesso/atenção/erro/neutro) — usado em
 * "seção pendente de revisão", "documento ilegível/insuficiente", "quesito
 * sem resposta" etc. Camada visual só; quem decide QUAL variante usar em
 * cada caso continua sendo a página/feature, não este componente.
 */

type Variante = "sucesso" | "atencao" | "erro" | "neutro";

const VARIANTES: Record<Variante, { badge: string; ponto: string }> = {
  sucesso: {
    badge: "bg-musgo-100 text-musgo-600 dark:bg-musgo-950 dark:text-musgo-400",
    ponto: "bg-musgo-600 dark:bg-musgo-400",
  },
  atencao: {
    badge: "bg-ambar-100 text-ambar-600 dark:bg-ambar-950 dark:text-ambar-400",
    ponto: "bg-ambar-600 dark:bg-ambar-400",
  },
  erro: {
    badge: "bg-vinho-100 text-vinho-600 dark:bg-vinho-950 dark:text-vinho-400",
    ponto: "bg-vinho-600 dark:bg-vinho-400",
  },
  neutro: {
    badge: "bg-nevoa-100 text-nevoa-600 dark:bg-nevoa-800 dark:text-nevoa-400",
    ponto: "bg-nevoa-400",
  },
};

export function Selo({ variante, children }: { variante: Variante; children: ReactNode }) {
  const estilo = VARIANTES[variante];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilo.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.ponto}`} aria-hidden="true" />
      {children}
    </span>
  );
}
