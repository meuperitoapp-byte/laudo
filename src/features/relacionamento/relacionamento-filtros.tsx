"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TIPO_ROTULOS, ORIGEM_ROTULOS } from "./catalogos";
import type { RelacionamentoTipo, RelacionamentoOrigem } from "@/types/enums";

const campoClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm " +
  "text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const rotuloClass = "block text-[11px] font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 mb-1";

const TIPOS: RelacionamentoTipo[] = ["advogado_escritorio", "cliente_saude", "profissional"];
const ORIGENS: RelacionamentoOrigem[] = [
  "indicacao", "redes_sociais", "comercial_pericons", "evento_palestra_curso",
  "meu_perito", "site_busca", "cliente_antigo_retorno", "parceria_institucional", "acolher", "outro",
];

export function RelacionamentoFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const get = useCallback((k: string) => searchParams.get(k) ?? "", [searchParams]);

  function aplicar(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div>
        <label className={rotuloClass}>Tipo</label>
        <select value={get("tipo")} onChange={(e) => aplicar({ tipo: e.target.value })} className={campoClass}>
          <option value="">Todos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_ROTULOS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={rotuloClass}>Origem</label>
        <select value={get("origem")} onChange={(e) => aplicar({ origem: e.target.value })} className={campoClass}>
          <option value="">Todas</option>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>{ORIGEM_ROTULOS[o]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={rotuloClass}>MEU PERITO</label>
        <select value={get("meu_perito")} onChange={(e) => aplicar({ meu_perito: e.target.value })} className={campoClass}>
          <option value="">Todos</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>
      <div>
        <label className={rotuloClass}>Faixa de contato</label>
        <select value={get("faixa")} onChange={(e) => aplicar({ faixa: e.target.value })} className={campoClass}>
          <option value="">Todas</option>
          <option value="verde">Ativo</option>
          <option value="amarelo">Atenção</option>
          <option value="laranja">Esfriando</option>
          <option value="vermelho">Reativar</option>
        </select>
      </div>
    </div>
  );
}
