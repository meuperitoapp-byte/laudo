"use client";

import { useState } from "react";

export interface BarraSimples {
  rotulo: string;
  valor: number;
}

const ALTURA = 180;

/**
 * Gráfico de barras verticais de UMA série (magnitude, não identidade) —
 * "Demandas por situação" (modelo de tela, 25/09/2026). Cor única
 * (--chart-teal, já validada) porque aqui a comparação é de TAMANHO entre
 * categorias, não de identidade — mesmo raciocínio de RankedBarList, só que
 * em barras verticais (poucas categorias, cabe lado a lado). Rótulo do valor
 * sempre visível em cima da barra — nunca só a altura carregando o dado.
 */
export function BarChartSimples({ dados, cor = "var(--chart-teal)" }: { dados: BarraSimples[]; cor?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="flex items-end justify-between gap-3" style={{ height: ALTURA }}>
      {dados.map((d, i) => {
        const alturaBarra = (d.valor / max) * (ALTURA - 40);
        return (
          <div
            key={d.rotulo}
            className="flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
          >
            <span className="text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 tabular-nums mb-1">{d.valor}</span>
            <div
              className="w-full max-w-12 rounded-t-md transition-opacity"
              style={{ height: Math.max(alturaBarra, 3), backgroundColor: cor, opacity: ativo === null || ativo === i ? 1 : 0.5 }}
            />
            <span className="text-[11px] text-nevoa-500 dark:text-nevoa-400 mt-2 text-center leading-tight">{d.rotulo}</span>
          </div>
        );
      })}
    </div>
  );
}
