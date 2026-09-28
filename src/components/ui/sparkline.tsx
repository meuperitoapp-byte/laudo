/**
 * Mini gráfico de linha/área — só pra dar textura de tendência dentro de um
 * KPI card (nunca leitura de valor exato, por isso sem eixo/rótulo/hover:
 * ver skill de dataviz, "choosing a form" — um sparkline é decoração de
 * contexto, o número grande ao lado é o dado de verdade). Cor por prop, nunca
 * fixa aqui — a página decide (musgo=tendência boa, vinho=ruim, teal=neutra),
 * sempre reaproveitando cor já validada em outro lugar do sistema.
 */
export function Sparkline({ valores, cor }: { valores: number[]; cor: string }) {
  if (valores.length < 2) return null;

  const largura = 100;
  const altura = 32;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const amplitude = max - min || 1;

  const pontos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * largura;
    const y = altura - ((v - min) / amplitude) * (altura - 4) - 2;
    return { x, y };
  });

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${linha} L${largura},${altura} L0,${altura} Z`;
  const id = `spark-${cor.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" className="w-full h-8" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
