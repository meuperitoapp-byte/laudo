"use client";

import { useState } from "react";

export interface PontoEvolucao {
  rotulo: string;
  valor: number;
}

const ALTURA = 200;
const MARGEM_INFERIOR = 20;

/**
 * Gráfico de linha/área de evolução mensal — "Evolução de processos"
 * (Dashboard) e "Demandas por mês" (Demandas), modelos de tela enviados pela
 * Dra. Fernanda (25/09/2026). Um eixo só (contagem), hover por ponto com
 * tooltip (skill de dataviz — todo gráfico de linha ganha crosshair+tooltip
 * por padrão), balão fixo destacando o valor mais recente (pedido explícito
 * do modelo). Cor única — é UMA série, não precisa de paleta categórica.
 */
export function EvolucaoMensalChart({ dados, cor = "var(--chart-teal)" }: { dados: PontoEvolucao[]; cor?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Sem dados no período selecionado.</p>;
  }

  const max = Math.max(1, ...dados.map((d) => d.valor));
  const areaAltura = ALTURA - MARGEM_INFERIOR;
  const largura = 100;
  const passo = dados.length > 1 ? largura / (dados.length - 1) : 0;

  const pontos = dados.map((d, i) => ({
    x: i * passo,
    y: areaAltura - (d.valor / max) * (areaAltura - 10),
    ...d,
  }));

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${linha} L${pontos[pontos.length - 1].x},${areaAltura} L0,${areaAltura} Z`;

  const ultimo = pontos[pontos.length - 1];
  const idGrad = "evolucao-grad";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${largura} ${ALTURA}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: ALTURA }}
        onMouseLeave={() => setAtivo(null)}
      >
        <defs>
          <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={largura}
            y1={areaAltura * f}
            y2={areaAltura * f}
            className="stroke-nevoa-100 dark:stroke-nevoa-800"
            strokeWidth="0.3"
          />
        ))}

        <path d={area} fill={`url(#${idGrad})`} />
        <path d={linha} fill="none" stroke={cor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

        {pontos.map((p, i) => (
          <g key={p.rotulo} onMouseEnter={() => setAtivo(i)}>
            <rect x={p.x - passo / 2} y="0" width={passo || largura} height={ALTURA} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={ativo === i ? 2 : 1.2} fill={cor} />
            <text x={p.x} y={ALTURA - 4} textAnchor="middle" fontSize="4.2" className="fill-nevoa-500 dark:fill-nevoa-400">
              {p.rotulo}
            </text>
          </g>
        ))}
      </svg>

      {/* Balão fixo no valor mais recente — pedido do modelo de tela. */}
      <div
        className="absolute rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white -translate-x-1/2 -translate-y-full pointer-events-none"
        style={{ left: `${ultimo.x}%`, top: `${(ultimo.y / ALTURA) * 100}%`, backgroundColor: cor }}
      >
        {ultimo.valor}
      </div>

      {ativo !== null && (
        <div
          className="absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 shadow-lg px-3 py-1.5 text-xs pointer-events-none z-10 whitespace-nowrap"
          style={{ left: `${pontos[ativo].x}%`, top: `${(pontos[ativo].y / ALTURA) * 100}%` }}
        >
          <span className="font-semibold text-nevoa-900 dark:text-nevoa-100">{pontos[ativo].rotulo}: </span>
          <span className="text-nevoa-700 dark:text-nevoa-300 tabular-nums">{pontos[ativo].valor}</span>
        </div>
      )}
    </div>
  );
}
