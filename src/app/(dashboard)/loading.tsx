/**
 * Skeleton genérico do grupo (dashboard) — sem isto, o Next só troca de tela
 * quando TODAS as consultas da página de destino terminam (nenhuma página do
 * app tinha loading.tsx antes disto, achado da varredura de velocidade de
 * 23/09/2026). O layout (TopNav) continua visível por baixo — isto só ocupa
 * a área de conteúdo enquanto a página carrega.
 */
export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-6 w-48 rounded-md bg-nevoa-200 dark:bg-nevoa-800 animate-pulse" />
      <div className="h-4 w-72 rounded-md bg-nevoa-200 dark:bg-nevoa-800 animate-pulse" />
      <div className="space-y-3 pt-4">
        <div className="h-24 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-100/60 dark:bg-nevoa-900/40 animate-pulse" />
        <div className="h-24 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-100/60 dark:bg-nevoa-900/40 animate-pulse" />
        <div className="h-24 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-100/60 dark:bg-nevoa-900/40 animate-pulse" />
      </div>
    </div>
  );
}
