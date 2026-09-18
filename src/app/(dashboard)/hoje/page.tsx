import Link from "next/link";
import { Plus, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import { classesBotao } from "@/components/ui/button";
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

const ABAS = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "proximos", rotulo: "Dentro do prazo" },
] as const;

/**
 * Painel "o que fazer hoje" — porta de entrada do sistema (decisão do
 * Jeferson, 11/09/2026). Só leitura: agrega o que já é pendente em qualquer
 * canto do sistema, sem cadastro manual. Ver docs/plano-modulo-central-prazos.md.
 *
 * Duas abas (item #5 da fila de melhorias, 19-20/09/2026): ela via itens de
 * dias diferentes misturados na mesma lista e queria "APENAS AS ATIVIDADES
 * DE HOJE" numa aba, com o resto do que ainda está dentro do prazo em outra.
 * "Hoje" = vencida (crítica) ou vence hoje (urgente) — os únicos dois níveis
 * em que esperar mais um dia já é tarde ou é o limite. O resto (alta/atenção/
 * programada/sem prazo) vai pra "Dentro do prazo". Aba por query string, não
 * client component: a página inteira já é Server Component só de leitura.
 */
export default async function HojePage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const abaAtiva = aba === "proximos" ? "proximos" : "hoje";

  const supabase = await createClient();
  const itens = await montarPainel(supabase);

  const hoje = itens.filter((i) => i.nivel === "critica" || i.nivel === "urgente");
  const dentroDoPrazo = itens.filter((i) => i.nivel === "alta" || i.nivel === "atencao" || i.nivel === "programada");
  const semPrazo = itens.filter((i) => i.nivel === "sem_prazo");

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link href="/tarefas/nova" className={classesBotao("secundaria", "gap-1.5")}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
          <Link
            href="/processos"
            className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400 whitespace-nowrap"
          >
            Ver processos →
          </Link>
        </div>
      </div>

      <div className="flex gap-2 border-b border-nevoa-200 dark:border-nevoa-800">
        {ABAS.map((a) => {
          const contagem = a.valor === "hoje" ? hoje.length : dentroDoPrazo.length + semPrazo.length;
          const ativa = a.valor === abaAtiva;
          return (
            <Link
              key={a.valor}
              href={a.valor === "hoje" ? "/hoje" : "/hoje?aba=proximos"}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                ativa
                  ? "border-petroleo-600 text-petroleo-700 dark:border-petroleo-400 dark:text-petroleo-400"
                  : "border-transparent text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-200"
              }`}
            >
              {a.rotulo} <span className="text-xs">({contagem})</span>
            </Link>
          );
        })}
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
          <CheckCircle2 className="h-8 w-8 text-musgo-600 dark:text-musgo-400" />
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">
            Nada pendente no momento — nenhum ciclo aberto, laudo sem protocolar ou item
            esperando providência.
          </p>
        </div>
      ) : abaAtiva === "hoje" ? (
        hoje.length > 0 ? (
          <ol className="space-y-2">
            {hoje.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
            <CheckCircle2 className="h-8 w-8 text-musgo-600 dark:text-musgo-400" />
            <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">
              Nada vencido ou vencendo hoje.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {dentroDoPrazo.length > 0 && (
            <ol className="space-y-2">
              {dentroDoPrazo.map((item) => (
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

          {dentroDoPrazo.length === 0 && semPrazo.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
              <CheckCircle2 className="h-8 w-8 text-musgo-600 dark:text-musgo-400" />
              <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">
                Nada dentro do prazo no momento.
              </p>
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
        className="flex flex-wrap items-center gap-3 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 px-4 py-3.5 text-sm transition-colors hover:border-petroleo-400 dark:hover:border-petroleo-600"
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
