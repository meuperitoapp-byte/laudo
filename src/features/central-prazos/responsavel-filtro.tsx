"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtro "Responsável" da Agenda (30/09/2026, feedback da Dra. Fernanda —
 * separar visualmente quem deve executar cada item). Mesmo padrão técnico de
 * `MovimentacoesFiltros` (URL searchParams via router.replace, preservando os
 * outros parâmetros da página) — só que aqui é um único campo, então não
 * precisa do aparato de "limpar filtros"/debounce daquele componente maior.
 */
export function ResponsavelFiltro({ opcoes }: { opcoes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valor = searchParams.get("responsavel") ?? "";

  const aplicar = useCallback(
    (novoValor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (novoValor) params.set("responsavel", novoValor);
      else params.delete("responsavel");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <select
      value={valor}
      onChange={(e) => aplicar(e.target.value)}
      aria-label="Filtrar por responsável"
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 px-3 py-1.5 text-sm text-nevoa-800 dark:text-nevoa-100 focus:outline-none focus:ring-2 focus:ring-petroleo-500"
    >
      <option value="">Todos os responsáveis</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
