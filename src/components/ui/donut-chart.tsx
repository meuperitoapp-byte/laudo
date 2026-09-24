export interface FatiaDonut {
  rotulo: string;
  valor: number;
  /** Valor de cor CSS (var(--chart-teal) etc.) — sempre um token já validado, nunca uma cor nova inventada aqui. */
  cor: string;
}

/**
 * Donut simples — só pra divisão de um TODO em poucas partes (2-4 fatias),
 * nunca pra listas longas (ver RankedBarList, escolha certa pra isso). Usa
 * só as 2 cores de gráfico já validadas pro dashboard (--chart-teal/
 * --chart-amber, ver globals.css e skill de dataviz) — nunca inventa cor
 * nova aqui. Rótulo + valor ficam escritos ao lado de cada fatia (rótulo
 * direto, não só cor) — identidade nunca depende só da cor.
 */
export function DonutChart({ itens }: { itens: FatiaDonut[] }) {
  const total = itens.reduce((soma, i) => soma + i.valor, 0);
  if (total === 0) {
    return <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Sem dados ainda.</p>;
  }

  const raio = 15.9155; // circunferência = 100, então cada % de valor = 1 unidade de dasharray
  const circunferencia = 2 * Math.PI * raio;

  // Comprimento + offset de cada fatia pré-calculados via reduce, sem mutar
  // nenhuma variável durante o render (eslint-plugin-react-hooks não
  // permite mais reatribuição de variável dentro da função de render).
  const fatias = itens.reduce<{ rotulo: string; valor: number; cor: string; comprimento: number; offset: number }[]>(
    (acc, item) => {
      const anterior = acc[acc.length - 1];
      const offset = anterior ? anterior.offset + anterior.comprimento : 0;
      const comprimento = (item.valor / total) * circunferencia;
      return [...acc, { ...item, comprimento, offset }];
    },
    [],
  );

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 36 36" className="h-28 w-28 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={raio} fill="none" className="stroke-nevoa-100 dark:stroke-nevoa-800/60" strokeWidth="4" />
        {fatias.map((fatia) => (
          <circle
            key={fatia.rotulo}
            cx="18"
            cy="18"
            r={raio}
            fill="none"
            stroke={fatia.cor}
            strokeWidth="4"
            strokeDasharray={`${fatia.comprimento} ${circunferencia - fatia.comprimento}`}
            strokeDashoffset={-fatia.offset}
          />
        ))}
      </svg>
      <ul className="space-y-2 text-sm">
        {itens.map((item) => (
          <li key={item.rotulo} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
            <span className="text-nevoa-700 dark:text-nevoa-300">{item.rotulo}</span>
            <span className="font-medium text-nevoa-900 dark:text-nevoa-100 tabular-nums ml-auto pl-3">{item.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
