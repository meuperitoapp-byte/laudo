"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SERVICOS_FILTRO } from "@/features/central-prazos/servico";

/** Filtro "Serviço" de "O que fazer hoje" — mesmo padrão de `ResponsavelFiltro` (searchParams na URL, preservando a aba). */
export function ServicoFiltro() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valor = searchParams.get("servico") ?? "";

  const aplicar = useCallback(
    (novoValor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (novoValor) params.set("servico", novoValor);
      else params.delete("servico");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <select
      value={valor}
      onChange={(e) => aplicar(e.target.value)}
      aria-label="Filtrar por serviço"
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 px-3 py-1.5 text-sm text-nevoa-800 dark:text-nevoa-100 focus:outline-none focus:ring-2 focus:ring-petroleo-500"
    >
      <option value="">Todos os serviços</option>
      {SERVICOS_FILTRO.map((s) => (
        <option key={s.codigo} value={s.codigo}>
          {s.rotulo}
        </option>
      ))}
    </select>
  );
}
