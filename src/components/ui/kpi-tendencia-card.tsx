import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Sparkline } from "./sparkline";

export type CorTendencia = "sucesso" | "erro" | "neutro";

const CORES: Record<CorTendencia, { texto: string; grafico: string }> = {
  // Cores de status já usadas em todo o sistema (Selo, badge.tsx) — nunca uma
  // cor nova. "sucesso"/"erro" só fazem sentido aqui porque a tendência É um
  // sinal de estado (foi bom ou ruim pra operação), não um dado categórico —
  // ver skill de dataviz, "status colors are reserved".
  sucesso: { texto: "text-musgo-600 dark:text-musgo-400", grafico: "#3b6b4a" },
  erro: { texto: "text-vinho-600 dark:text-vinho-400", grafico: "#8c3a3a" },
  neutro: { texto: "text-nevoa-500 dark:text-nevoa-400", grafico: "#9b9488" },
};

export interface Tendencia {
  percentual: number;
  cor: CorTendencia;
  rotulo?: string;
}

/**
 * KPI card com sparkline + variação — evolução do StatTile pro Dashboard e
 * pra Demandas (modelos de tela enviados pela Dra. Fernanda, 25/09/2026).
 * `tendencia` opcional: quando o sistema não tem como saber o valor de um
 * mês atrás sem inventar (ex.: Pendências abertas — não existe histórico de
 * quando cada pendência surgiu), a página simplesmente não passa a prop, e o
 * card mostra só o número, sem seta nem sparkline — nunca um percentual
 * fabricado só pra "bater" com o modelo visual.
 */
export function KpiTendenciaCard({
  rotulo,
  valor,
  icone,
  href,
  tendencia,
  sparkline,
}: {
  rotulo: string;
  valor: string | number;
  icone: ReactNode;
  href?: string;
  tendencia?: Tendencia;
  sparkline?: number[];
}) {
  const cores = tendencia ? CORES[tendencia.cor] : CORES.neutro;
  const Icone = !tendencia || tendencia.percentual === 0 ? Minus : tendencia.percentual > 0 ? ArrowUp : ArrowDown;

  const conteudo = (
    <div className="flex flex-col gap-3 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5 h-full transition-colors group-hover:border-petroleo-300 dark:group-hover:border-petroleo-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-petroleo-100 dark:bg-petroleo-500/15 text-petroleo-600 dark:text-petroleo-400">
          {icone}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 truncate">{rotulo}</p>
        <p className="font-title text-[28px] leading-tight font-semibold text-nevoa-900 dark:text-nevoa-50 tabular-nums">{valor}</p>
      </div>
      {tendencia && (
        <p className={`flex items-center gap-1 text-xs font-medium ${cores.texto}`}>
          <Icone className="h-3.5 w-3.5" />
          {tendencia.percentual > 0 ? "+" : ""}
          {tendencia.percentual}%
          <span className="text-nevoa-400 dark:text-nevoa-600 font-normal">
            {tendencia.rotulo ?? "vs. período anterior"}
          </span>
        </p>
      )}
      {sparkline && sparkline.length > 1 && <Sparkline valores={sparkline} cor={cores.grafico} />}
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
