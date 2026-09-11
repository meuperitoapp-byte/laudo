import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import { montarPainel } from "@/features/central-prazos/agregador";
import { NIVEL_ROTULOS, NIVEL_SELO_VARIANTE, URGENTE_BADGE_CLASSE } from "@/features/central-prazos/rotulos";
import type { ItemPainel } from "@/features/central-prazos/tipos";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
};

/** O selo de nível — 5 dos 6 níveis reusam o `Selo` compartilhado; "Urgente" (laranja) não tem variante equivalente hoje (ver rotulos.ts). */
function SeloNivel({ item }: { item: ItemPainel }) {
  const rotulo = NIVEL_ROTULOS[item.nivel];
  if (item.nivel === "urgente") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${URGENTE_BADGE_CLASSE}`}>
        {rotulo}
      </span>
    );
  }
  return <Selo variante={NIVEL_SELO_VARIANTE[item.nivel] ?? "neutro"}>{rotulo}</Selo>;
}

/**
 * Painel "o que fazer hoje" — porta de entrada do sistema (decisão do
 * Jeferson, 11/09/2026). Só leitura: agrega o que já é pendente em qualquer
 * canto do sistema, sem cadastro manual. Ver docs/plano-modulo-central-prazos.md.
 */
export default async function HojePage() {
  const supabase = await createClient();
  const itens = await montarPainel(supabase);

  const pendentes = itens.filter((i) => i.nivel !== "sem_prazo");
  const semPrazo = itens.filter((i) => i.nivel === "sem_prazo");

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">
            O que fazer hoje
          </h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
            Reúne o que já está pendente nos processos em andamento — sem precisar abrir
            ciclo por ciclo pra descobrir.
          </p>
        </div>
        <Link
          href="/processos"
          className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400 whitespace-nowrap"
        >
          Ver processos →
        </Link>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          Nada pendente no momento — nenhum ciclo aberto, laudo sem protocolar ou item
          esperando providência.
        </p>
      ) : (
        <div className="space-y-6">
          {pendentes.length > 0 && (
            <ol className="space-y-2">
              {pendentes.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </ol>
          )}

          {semPrazo.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-title text-xs font-semibold uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 pt-2">
                Sem prazo — não vencem, mas seguem pendentes
              </h2>
              <ol className="space-y-2">
                {semPrazo.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function ItemCard({ item }: { item: ItemPainel }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 px-4 py-3 text-sm hover:border-petroleo-400 dark:hover:border-petroleo-600"
      >
        <SeloNivel item={item} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-nevoa-900 dark:text-nevoa-100 truncate">{item.titulo}</p>
          <p className="text-nevoa-500 dark:text-nevoa-400">
            {item.providencia}
            {item.subtitulo ? ` · ${item.subtitulo}` : ""}
          </p>
        </div>
        <div className="text-xs text-nevoa-500 dark:text-nevoa-400 text-right shrink-0">
          {item.prazo && <p>Prazo: {dataCurta(item.prazo)}</p>}
          {item.dataContexto && (
            <p>
              {item.dataContexto.rotulo} {dataCurta(item.dataContexto.valor)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
