import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Card de KPI do dashboard — número grande + rótulo + ícone de contexto.
 * Camada de apresentação pura (dado calculado na page). `tabular-nums`
 * porque números de dashboard ficam lado a lado o tempo todo — sem isso,
 * dígitos de largura variável fazem os cards "dançarem" entre si.
 */
export function StatTile({
  rotulo,
  valor,
  icone,
  href,
}: {
  rotulo: string;
  valor: string | number;
  icone: ReactNode;
  href?: string;
}) {
  const conteudo = (
    <div className="flex items-center gap-4 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5 h-full transition-colors group-hover:border-petroleo-300 dark:group-hover:border-petroleo-700">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-petroleo-100 dark:bg-petroleo-500/15 text-petroleo-600 dark:text-petroleo-400">
        {icone}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 truncate">
          {rotulo}
        </p>
        <p className="font-title text-[28px] leading-tight font-semibold text-nevoa-900 dark:text-nevoa-50">
          {valor}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}
