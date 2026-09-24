import type { ReactNode } from "react";

/**
 * Cartão-moldura de seção de dashboard (título + subtítulo opcional +
 * conteúdo) — extraído do Dashboard pra ser reaproveitado pelo Financeiro.
 *
 * `total` (24/09/2026, referência visual trazida por ela) — número grande no
 * canto, mesma ideia do "Total no meio da rosca" de painéis tipo Power BI,
 * só que aplicado ao cartão de lista de barras já existente (mantém a barra
 * ranqueada pras distribuições com muitas categorias, em vez de trocar por
 * donut ilegível de 13 fatias — ver comentário em dashboard/page.tsx).
 */
export function DashboardCard({
  titulo,
  subtitulo,
  total,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  total?: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h2>
          {subtitulo && <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">{subtitulo}</p>}
        </div>
        {total !== undefined && (
          <div className="text-right shrink-0">
            <p className="font-title text-xl font-semibold text-nevoa-900 dark:text-nevoa-100 tabular-nums leading-none">
              {total}
            </p>
            <p className="text-[11px] text-nevoa-400 dark:text-nevoa-600 mt-0.5">Total</p>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
