"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SITUACOES_PROCESSO_ORDENADA } from "@/features/processos/catalogos";

const campoClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm " +
  "text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

export function ProcessosFiltros({
  tiposLaudo,
  situacoesFinanceiras,
}: {
  tiposLaudo: { id: string; nome: string }[];
  situacoesFinanceiras: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((k: string) => searchParams.get(k) ?? "", [searchParams]);

  /** Aplica um patch de parâmetros na URL (valor vazio = remove o parâmetro). */
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

  // Campos de texto: estado local + debounce, pra não navegar a cada tecla.
  const [texto, setTexto] = useState({
    numero: get("numero"),
    periciando: get("periciando"),
    comarca: get("comarca"),
  });
  const primeiroRender = useRef(true);
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      aplicar({ numero: texto.numero.trim(), periciando: texto.periciando.trim(), comarca: texto.comarca.trim() });
    }, 350);
    return () => clearTimeout(t);
  }, [texto, aplicar]);

  // "situacao" faz o papel dos dois filtros antigos (Andamento + Situação):
  // vazio = visão padrão (esconde "Finalizado"); um valor da lista = exatamente
  // aquela etapa; "todos" = sem filtro nenhum de situação.
  const situacaoAtual = get("situacao") || "";
  const algumFiltro =
    situacaoAtual !== "" ||
    ["numero", "periciando", "comarca", "tipo_laudo", "tipo_trabalho", "situacao_financeira", "data_inicial", "data_final"].some(
      (k) => get(k),
    );

  function limpar() {
    setTexto({ numero: "", periciando: "", comarca: "" });
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-50/60 dark:bg-nevoa-900/30 p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <input
          value={texto.numero}
          onChange={(e) => setTexto((s) => ({ ...s, numero: e.target.value }))}
          placeholder="Número do processo"
          className={campoClass}
        />
        <input
          value={texto.periciando}
          onChange={(e) => setTexto((s) => ({ ...s, periciando: e.target.value }))}
          placeholder="Nome do periciando(a)"
          className={campoClass}
        />
        <input
          value={texto.comarca}
          onChange={(e) => setTexto((s) => ({ ...s, comarca: e.target.value }))}
          placeholder="Comarca / Subseção"
          className={campoClass}
        />

        <select
          value={get("tipo_laudo")}
          onChange={(e) => aplicar({ tipo_laudo: e.target.value })}
          className={campoClass}
        >
          <option value="">Tipo de laudo (todos)</option>
          {tiposLaudo.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>

        <select
          value={get("tipo_trabalho")}
          onChange={(e) => aplicar({ tipo_trabalho: e.target.value })}
          className={campoClass}
        >
          <option value="">Tipo de trabalho (todos)</option>
          <option value="pericia_judicial">Perícia Judicial</option>
          <option value="assistencia_tecnica">Assistência Técnica</option>
        </select>

        <select
          value={situacaoAtual}
          onChange={(e) => aplicar({ situacao: e.target.value })}
          className={campoClass}
        >
          <option value="">Em andamento (esconde Finalizado)</option>
          {SITUACOES_PROCESSO_ORDENADA.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="todos">Todos</option>
        </select>

        <select
          value={get("situacao_financeira")}
          onChange={(e) => aplicar({ situacao_financeira: e.target.value })}
          className={campoClass}
        >
          <option value="">Situação financeira (todas)</option>
          {situacoesFinanceiras.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-nevoa-500 dark:text-nevoa-400">
          <span className="shrink-0">De</span>
          <input
            type="date"
            value={get("data_inicial")}
            onChange={(e) => aplicar({ data_inicial: e.target.value })}
            className={campoClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-nevoa-500 dark:text-nevoa-400">
          <span className="shrink-0">Até</span>
          <input
            type="date"
            value={get("data_final")}
            onChange={(e) => aplicar({ data_final: e.target.value })}
            className={campoClass}
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
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
