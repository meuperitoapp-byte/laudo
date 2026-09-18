import type { ReactNode } from "react";

/** Cartão-moldura de seção de dashboard (título + subtítulo opcional + conteúdo) — extraído do Dashboard pra ser reaproveitado pelo Financeiro. */
export function DashboardCard({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5">
      <div className="mb-4">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h2>
        {subtitulo && <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}
