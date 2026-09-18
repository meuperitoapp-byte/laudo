export interface ItemBarra {
  rotulo: string;
  valor: number;
  href?: string;
}

/** Conta ocorrências de um valor (texto livre, pode ser null) e devolve ranqueado, maior primeiro — usado pelo Dashboard e pelo Financeiro. */
export function ranquear(valores: (string | null)[], rotuloVazio = "Não informado"): ItemBarra[] {
  const contagem = new Map<string, number>();
  for (const v of valores) {
    const chave = v?.trim() || rotuloVazio;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Lista de barras horizontais ranqueadas — forma escolhida (skill de
 * dataviz) pra distribuições com muitas categorias (situação do processo
 * chega a 13 valores hoje): um donut de 13 fatias vira ruído ilegível bem
 * antes disso ("mais de ~7 classes → tabela/lista", não mais cor). Cor
 * única (petroleo de gráfico) porque o trabalho aqui é comparar MAGNITUDE
 * entre categorias, não distinguir identidade — não precisa de paleta
 * categórica nem do teste de daltonismo que ela exige.
 *
 * Cada linha já vem ordenada por quem chama (maior primeiro). A barra
 * cresce da esquerda (base, quadrada) pra direita (ponta, arredondada);
 * o valor fica fora da barra, numa coluna própria à direita, alinhado —
 * por isso `tabular-nums` aqui (é coluna, não número solto).
 */
export function RankedBarList({ itens }: { itens: ItemBarra[] }) {
  const maior = Math.max(1, ...itens.map((i) => i.valor));

  if (itens.length === 0) {
    return <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Sem dados ainda.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {itens.map((item) => {
        const largura = Math.max(3, Math.round((item.valor / maior) * 100));
        const linha = (
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-3">
            <div className="min-w-0">
              <p
                title={item.rotulo}
                className="truncate text-sm text-nevoa-700 dark:text-nevoa-300 mb-1"
              >
                {item.rotulo}
              </p>
              <div className="h-2 rounded-r-[4px] bg-nevoa-100 dark:bg-nevoa-800/60 overflow-hidden">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${largura}%`, backgroundColor: "var(--chart-teal)" }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100 tabular-nums text-right">
              {item.valor}
            </span>
          </div>
        );

        if (item.href) {
          return (
            <li key={item.rotulo}>
              <a href={item.href} className="block -m-1 p-1 rounded-md hover:bg-nevoa-50 dark:hover:bg-nevoa-900/40">
                {linha}
              </a>
            </li>
          );
        }
        return <li key={item.rotulo}>{linha}</li>;
      })}
    </ul>
  );
}
