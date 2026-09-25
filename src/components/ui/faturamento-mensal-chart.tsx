"use client";

import { useMemo, useState } from "react";
import type { MesFaturamento } from "@/features/financeiro/faturamento-mensal";

function moedaBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function moedaBRLCompleta(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ALTURA = 220;
const META_METADE = ALTURA / 2 - 24; // espaço reservado pro rótulo do mês embaixo e a legenda em cima

/**
 * Gráfico de Faturamento mensal (Financeiro, 25/09/2026 — pedido dela: "ver
 * por mês, com demonstração dos serviços e saídas, pra atuar no crescimento
 * da empresa"). Barras divergentes de UM eixo só (R$): Faturamento pra cima,
 * Saídas pra baixo, linha de zero no meio — nunca dois eixos (skill de
 * dataviz, "one axis" é o erro nº1 de gráfico). Cores: --chart-teal
 * (Faturamento) / --chart-vinho (Saídas), validadas juntas (ver globals.css)
 * — sempre com rótulo por extenso ao lado, nunca só a cor (a separação sob
 * daltonismo fica na faixa de alerta no modo escuro).
 */
export function FaturamentoMensalChart({
  dadosPorAno,
  anos,
  anoInicial,
}: {
  dadosPorAno: Record<number, MesFaturamento[]>;
  anos: number[];
  anoInicial: number;
}) {
  const [ano, setAno] = useState(anoInicial);
  const [mesAtivo, setMesAtivo] = useState<number | null>(null);
  const [modoTabela, setModoTabela] = useState(false);

  const dados = dadosPorAno[ano] ?? [];
  const maiorValor = useMemo(() => Math.max(1, ...dados.flatMap((d) => [d.faturamento, d.saidas])), [dados]);

  const totalFaturamento = dados.reduce((s, d) => s + d.faturamento, 0);
  const totalSaidas = dados.reduce((s, d) => s + d.saidas, 0);

  const larguraBarra = 100 / dados.length;

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Faturamento mensal</h2>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">Entradas (por serviço) e saídas, mês a mês</p>
        </div>
        <div className="flex items-center gap-3">
          {anos.length > 1 && (
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-sm text-nevoa-900 dark:text-nevoa-100"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setModoTabela((v) => !v)}
            className="text-xs text-petroleo-600 hover:underline dark:text-petroleo-400"
          >
            {modoTabela ? "Ver gráfico" : "Ver como tabela"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "var(--chart-teal)" }} />
          <span className="text-nevoa-700 dark:text-nevoa-300">Faturamento — {moedaBRL(totalFaturamento)} no ano</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "var(--chart-vinho)" }} />
          <span className="text-nevoa-700 dark:text-nevoa-300">Saídas — {moedaBRL(totalSaidas)} no ano</span>
        </span>
      </div>

      {dados.every((d) => d.faturamento === 0 && d.saidas === 0) ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma movimentação lançada em {ano} ainda.</p>
      ) : modoTabela ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-nevoa-500 dark:text-nevoa-400 border-b border-nevoa-200 dark:border-nevoa-800">
                <th className="py-1.5 pr-3 font-medium">Mês</th>
                <th className="py-1.5 pr-3 font-medium">Faturamento</th>
                <th className="py-1.5 pr-3 font-medium">— Perícia Judicial</th>
                <th className="py-1.5 pr-3 font-medium">— Assistência Técnica</th>
                <th className="py-1.5 pr-3 font-medium">— Outros</th>
                <th className="py-1.5 font-medium">Saídas</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.mes} className="border-b border-nevoa-100 dark:border-nevoa-900 last:border-0">
                  <td className="py-1.5 pr-3 text-nevoa-800 dark:text-nevoa-200">{d.mes}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-nevoa-900 dark:text-nevoa-100 font-medium">{moedaBRLCompleta(d.faturamento)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-nevoa-600 dark:text-nevoa-400">{moedaBRLCompleta(d.porCategoria.judicial)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-nevoa-600 dark:text-nevoa-400">{moedaBRLCompleta(d.porCategoria.at)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-nevoa-600 dark:text-nevoa-400">{moedaBRLCompleta(d.porCategoria.outros)}</td>
                  <td className="py-1.5 tabular-nums text-nevoa-900 dark:text-nevoa-100 font-medium">{moedaBRLCompleta(d.saidas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 100 ${ALTURA}`} preserveAspectRatio="none" className="w-full" style={{ height: ALTURA }} onMouseLeave={() => setMesAtivo(null)}>
            <line x1="0" y1={ALTURA / 2} x2="100" y2={ALTURA / 2} className="stroke-nevoa-200 dark:stroke-nevoa-800" strokeWidth="0.3" />
            {dados.map((d, i) => {
              const x = i * larguraBarra;
              const alturaFaturamento = (d.faturamento / maiorValor) * META_METADE;
              const alturaSaida = (d.saidas / maiorValor) * META_METADE;
              const ativo = mesAtivo === i;
              return (
                <g
                  key={d.mes}
                  onMouseEnter={() => setMesAtivo(i)}
                  className="cursor-pointer"
                >
                  <rect x={x} y="0" width={larguraBarra} height={ALTURA} fill="transparent" />
                  <rect
                    x={x + larguraBarra * 0.2}
                    y={ALTURA / 2 - alturaFaturamento}
                    width={larguraBarra * 0.6}
                    height={alturaFaturamento}
                    rx="1"
                    fill="var(--chart-teal)"
                    opacity={ativo || mesAtivo === null ? 1 : 0.45}
                  />
                  <rect
                    x={x + larguraBarra * 0.2}
                    y={ALTURA / 2}
                    width={larguraBarra * 0.6}
                    height={alturaSaida}
                    rx="1"
                    fill="var(--chart-vinho)"
                    opacity={ativo || mesAtivo === null ? 1 : 0.45}
                  />
                  <text x={x + larguraBarra / 2} y={ALTURA - 6} textAnchor="middle" fontSize="4.5" className="fill-nevoa-500 dark:fill-nevoa-400">
                    {d.mes}
                  </text>
                </g>
              );
            })}
          </svg>

          {mesAtivo !== null && dados[mesAtivo] && (
            <div
              className="absolute top-0 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 shadow-lg px-3 py-2 text-xs pointer-events-none z-10 w-56"
              style={{
                left: `${Math.min(Math.max(mesAtivo * larguraBarra, 5), 72)}%`,
              }}
            >
              <p className="font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">
                {dados[mesAtivo].mes}/{ano}
              </p>
              <p className="text-nevoa-700 dark:text-nevoa-300">Faturamento: <span className="font-medium tabular-nums">{moedaBRLCompleta(dados[mesAtivo].faturamento)}</span></p>
              <p className="text-nevoa-500 dark:text-nevoa-400 pl-2">· Perícia Judicial: {moedaBRLCompleta(dados[mesAtivo].porCategoria.judicial)}</p>
              <p className="text-nevoa-500 dark:text-nevoa-400 pl-2">· Assistência Técnica: {moedaBRLCompleta(dados[mesAtivo].porCategoria.at)}</p>
              {dados[mesAtivo].porCategoria.outros > 0 && (
                <p className="text-nevoa-500 dark:text-nevoa-400 pl-2">· Outros: {moedaBRLCompleta(dados[mesAtivo].porCategoria.outros)}</p>
              )}
              <p className="text-nevoa-700 dark:text-nevoa-300 mt-1">Saídas: <span className="font-medium tabular-nums">{moedaBRLCompleta(dados[mesAtivo].saidas)}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
