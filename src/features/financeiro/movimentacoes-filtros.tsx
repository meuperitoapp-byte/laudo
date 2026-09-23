"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const campoClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm " +
  "text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const rotuloCampoClass = "block text-[11px] font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 mb-1";

function Campo({ rotulo, htmlFor, children }: { rotulo: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={rotuloCampoClass}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}

/**
 * Filtro da lista de Movimentações (entrada/saída) — pedido dela
 * (21/09/2026), mesmo padrão visual/técnico de `ProcessosFiltros`
 * (URL searchParams + debounce nos campos de texto). Os parâmetros usam
 * prefixo `mov_` pra não colidir com nenhum outro filtro que a página
 * de Financeiro venha a ganhar no futuro.
 */
export function MovimentacoesFiltros({ categorias, contas }: { categorias: string[]; contas: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((k: string) => searchParams.get(k) ?? "", [searchParams]);

  const aplicar = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      const qs = params.toString();
      if (qs === searchParams.toString()) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [processo, setProcesso] = useState(get("mov_processo"));
  const primeiroRender = useRef(true);
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const t = setTimeout(() => aplicar({ mov_processo: processo.trim() }), 350);
    return () => clearTimeout(t);
  }, [processo, aplicar]);

  const algumFiltro = ["mov_tipo", "mov_conta", "mov_categoria", "mov_processo", "mov_data_inicial", "mov_data_final"].some((k) =>
    get(k),
  );

  function limpar() {
    setProcesso("");
    const params = new URLSearchParams(searchParams.toString());
    for (const k of ["mov_tipo", "mov_conta", "mov_categoria", "mov_processo", "mov_data_inicial", "mov_data_final"]) {
      params.delete(k);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-4">Filtrar movimentações</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Campo rotulo="Processo/nome" htmlFor="mf-processo">
          <input
            id="mf-processo"
            value={processo}
            onChange={(e) => setProcesso(e.target.value)}
            placeholder="Número ou nome"
            className={campoClass}
          />
        </Campo>
        <Campo rotulo="Tipo" htmlFor="mf-tipo">
          <select id="mf-tipo" value={get("mov_tipo")} onChange={(e) => aplicar({ mov_tipo: e.target.value })} className={campoClass}>
            <option value="">Todas</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </Campo>
        <Campo rotulo="Conta" htmlFor="mf-conta">
          <select id="mf-conta" value={get("mov_conta")} onChange={(e) => aplicar({ mov_conta: e.target.value })} className={campoClass}>
            <option value="">Todas</option>
            {contas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Categoria" htmlFor="mf-categoria">
          <select
            id="mf-categoria"
            value={get("mov_categoria")}
            onChange={(e) => aplicar({ mov_categoria: e.target.value })}
            className={campoClass}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="De" htmlFor="mf-data-inicial">
            <input
              id="mf-data-inicial"
              type="date"
              value={get("mov_data_inicial")}
              onChange={(e) => aplicar({ mov_data_inicial: e.target.value })}
              className={campoClass}
            />
          </Campo>
          <Campo rotulo="Até" htmlFor="mf-data-final">
            <input
              id="mf-data-final"
              type="date"
              value={get("mov_data_final")}
              onChange={(e) => aplicar({ mov_data_final: e.target.value })}
              className={campoClass}
            />
          </Campo>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={limpar}
          disabled={!algumFiltro}
          className="text-sm text-nevoa-600 hover:text-vinho-600 dark:text-nevoa-400 dark:hover:text-vinho-400 disabled:opacity-40 disabled:hover:text-nevoa-600"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
