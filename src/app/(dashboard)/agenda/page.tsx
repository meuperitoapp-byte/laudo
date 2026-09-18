import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import { montarPainel } from "@/features/central-prazos/agregador";
import { hojeIsoBrasil, paraDiasUtc, NIVEL_ORDEM } from "@/features/central-prazos/regras";
import {
  NIVEL_ROTULOS,
  NIVEL_SELO_VARIANTE,
  URGENTE_BADGE_CLASSE,
  GRUPO_AGENDA_ROTULOS,
  GRUPO_AGENDA_POR_CATEGORIA,
  type GrupoAgenda,
} from "@/features/central-prazos/rotulos";
import type { ItemPainel } from "@/features/central-prazos/tipos";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
};

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Cabeçalho de cada grupo de data — "Hoje"/"Amanhã"/"Atrasado" quando aplicável, senão dia da semana + data. */
function rotuloData(iso: string, hoje: string): string {
  const dias = paraDiasUtc(iso) - paraDiasUtc(hoje);
  if (dias === 0) return `Hoje — ${dataCurta(iso)}`;
  if (dias === 1) return `Amanhã — ${dataCurta(iso)}`;
  if (dias < 0) return `Atrasado (${dataCurta(iso)})`;
  const diaSemana = DIAS_SEMANA[new Date(`${iso}T12:00:00`).getDay()];
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)} — ${dataCurta(iso)}`;
}

/** Mesmo selo de nível usado em /hoje — duplicado aqui de propósito, é pouca coisa pra duas telas só. */
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

const FILTROS: { valor: GrupoAgenda | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pericias", rotulo: GRUPO_AGENDA_ROTULOS.pericias },
  { valor: "reunioes", rotulo: GRUPO_AGENDA_ROTULOS.reunioes },
  { valor: "prazos", rotulo: GRUPO_AGENDA_ROTULOS.prazos },
  { valor: "tarefas", rotulo: GRUPO_AGENDA_ROTULOS.tarefas },
];

/**
 * Agenda unificada (item já combinado desde 19/09/2026, construído em
 * 23/09/2026) — mesma fonte de dados de /hoje (`montarPainel`), só
 * reorganizada por DATA em vez de por nível de urgência: aqui o que
 * importa é "quando", lá é "quão urgente". Só entram itens com prazo REAL
 * (`item.prazo !== null`) — "sem prazo" não tem o que plotar num
 * calendário, continua exclusivo de /hoje.
 *
 * "Calendário" não é uma fonte à parte, é a própria visão cronológica.
 * "Reuniões" hoje só tem um tipo (Estratégia pericial, AT) — cresce
 * sozinho conforme mais tipos de reunião forem cadastrados no sistema.
 * Filtro por pessoa/área fica de fora (depende da decisão de papéis, ainda
 * em aberto) — o filtro aqui é só por tipo de item.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { grupo } = await searchParams;
  const grupoAtivo: GrupoAgenda | "todos" = FILTROS.some((f) => f.valor === grupo) ? (grupo as GrupoAgenda) : "todos";

  const supabase = await createClient();
  const itens = await montarPainel(supabase);
  const hoje = hojeIsoBrasil();

  const comData = itens.filter((i): i is ItemPainel & { prazo: string } => i.prazo !== null);
  const filtrados =
    grupoAtivo === "todos" ? comData : comData.filter((i) => GRUPO_AGENDA_POR_CATEGORIA[i.categoria] === grupoAtivo);

  const ordenados = [...filtrados].sort((a, b) => {
    const porData = a.prazo.localeCompare(b.prazo);
    if (porData !== 0) return porData;
    return NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel];
  });

  const grupos: { data: string; itens: ItemPainel[] }[] = [];
  for (const item of ordenados) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.data === item.prazo) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ data: item.prazo, itens: [item] });
    }
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Agenda</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Perícias, reuniões, prazos e tarefas organizados por data — recebe automaticamente o que nasce dentro dos
          Casos. Itens sem data ficam só em{" "}
          <Link href="/hoje" className="text-petroleo-600 hover:underline dark:text-petroleo-400">
            Hoje
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-nevoa-200 dark:border-nevoa-800">
        {FILTROS.map((f) => {
          const contagem =
            f.valor === "todos" ? comData.length : comData.filter((i) => GRUPO_AGENDA_POR_CATEGORIA[i.categoria] === f.valor).length;
          const ativo = f.valor === grupoAtivo;
          return (
            <Link
              key={f.valor}
              href={f.valor === "todos" ? "/agenda" : `/agenda?grupo=${f.valor}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                ativo
                  ? "border-petroleo-600 text-petroleo-700 dark:border-petroleo-400 dark:text-petroleo-400"
                  : "border-transparent text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-200"
              }`}
            >
              {f.rotulo} <span className="text-xs">({contagem})</span>
            </Link>
          );
        })}
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
          <CalendarX2 className="h-8 w-8 text-nevoa-400 dark:text-nevoa-600" />
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">
            Nada com data marcada por aqui no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.data} className="space-y-2">
              <h2 className="font-title text-xs font-semibold uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400 pt-2">
                {rotuloData(g.data, hoje)}
              </h2>
              <ol className="space-y-2">
                {g.itens.map((item) => (
                  <li key={item.id}>
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
                      <span className="text-xs text-nevoa-400 dark:text-nevoa-600 shrink-0">
                        {GRUPO_AGENDA_ROTULOS[GRUPO_AGENDA_POR_CATEGORIA[item.categoria]]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
