"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Lupa de busca da tela Casos do perfil restrito (pedido dela, 11/10/2026:
 * "inserir uma lupa de pesquisa para pesquisar por nome"). Só escreve
 * `?busca=` na URL, com debounce — quem filtra é a consulta do servidor em
 * processos/page.tsx, mesmo padrão de ProcessosFiltros.
 */
export function BuscaCasos() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [texto, setTexto] = useState(searchParams.get("busca") ?? "");
  const primeiroRender = useRef(true);

  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const valor = texto.trim();
      if (valor) params.set("busca", valor);
      else params.delete("busca");
      const qs = params.toString();
      if (qs === searchParams.toString()) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [texto, router, pathname, searchParams]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nevoa-400 dark:text-nevoa-500" />
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nome, nº do processo ou advogado"
        aria-label="Buscar casos"
        className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 py-2 pl-9 pr-3 text-sm text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
      />
    </div>
  );
}
