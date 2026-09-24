import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { montarPainel } from "@/features/central-prazos/agregador";
import { hojeIsoBrasil, NIVEL_ORDEM, filtrarPorAcesso } from "@/features/central-prazos/regras";
import {
  GRUPO_AGENDA_ROTULOS,
  GRUPO_AGENDA_POR_CATEGORIA,
  type GrupoAgenda,
} from "@/features/central-prazos/rotulos";
import type { ItemPainel } from "@/features/central-prazos/tipos";
import { RESPONSAVEL_TAREFA_SEED } from "@/features/central-prazos/catalogos";
import { ResponsavelFiltro } from "@/features/central-prazos/responsavel-filtro";
import { obterContextoAcesso } from "@/features/acessos/contexto";

const DIAS_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "YYYY-MM-DD" a partir de dias desde a época UTC — inverso de `paraDiasUtc`. */
function isoDeDiasUtc(dias: number): string {
  const d = new Date(dias * 86_400_000);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Mesma dupla de tons (100/600 claro, 950/400 escuro) do `Selo` compartilhado — hover só varia a opacidade pra não depender de mais um tom por cor. */
const GRUPO_PILL_CLASSE: Record<GrupoAgenda, string> = {
  pericias: "bg-musgo-100 text-musgo-600 dark:bg-musgo-950 dark:text-musgo-400 hover:opacity-75",
  reunioes: "bg-petroleo-100 text-petroleo-600 dark:bg-petroleo-700 dark:text-petroleo-400 hover:opacity-75",
  prazos: "bg-vinho-100 text-vinho-600 dark:bg-vinho-950 dark:text-vinho-400 hover:opacity-75",
  tarefas: "bg-ambar-100 text-ambar-600 dark:bg-ambar-950 dark:text-ambar-400 hover:opacity-75",
};

const FILTROS: { valor: GrupoAgenda | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pericias", rotulo: GRUPO_AGENDA_ROTULOS.pericias },
  { valor: "reunioes", rotulo: GRUPO_AGENDA_ROTULOS.reunioes },
  { valor: "prazos", rotulo: GRUPO_AGENDA_ROTULOS.prazos },
  { valor: "tarefas", rotulo: GRUPO_AGENDA_ROTULOS.tarefas },
];

type BuscaParams = { ano: number; mes: number; grupo: GrupoAgenda | "todos"; q: string; responsavel: string };

function querystring(params: Partial<BuscaParams>, base: BuscaParams): string {
  const efetivo = { ...base, ...params };
  const sp = new URLSearchParams();
  sp.set("ano", String(efetivo.ano));
  sp.set("mes", String(efetivo.mes));
  if (efetivo.grupo !== "todos") sp.set("grupo", efetivo.grupo);
  if (efetivo.q.trim()) sp.set("q", efetivo.q.trim());
  if (efetivo.responsavel) sp.set("responsavel", efetivo.responsavel);
  return `/agenda?${sp.toString()}`;
}

/**
 * Agenda unificada — grade mensal (pedido da Dra. Fernanda, 18/09/2026, com
 * referência visual de calendário mensal colorido por tipo). Substitui a
 * primeira versão em lista cronológica (commit `80a5c9e`): mesma fonte de
 * dados (`montarPainel`), só a apresentação muda de lista pra grade.
 *
 * Navegação por mês via query string (`ano`/`mes`) — sem seletor de
 * ano/mês por dropdown de propósito: um `<select>` que auto-envia exige
 * Client Component, e o padrão do app inteiro pra filtro é link/querystring
 * em Server Component (mesmo padrão de /hoje e da versão anterior da
 * Agenda). "Perito ou Assistente" (filtro do modelo de referência) fica de
 * fora — depende da decisão de papéis/permissões, ainda em aberto.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; grupo?: string; q?: string; responsavel?: string }>;
}) {
  const sp = await searchParams;
  const hoje = hojeIsoBrasil();
  const hojeAno = Number(hoje.slice(0, 4));
  const hojeMes = Number(hoje.slice(5, 7));

  const anoAtivo = Number(sp.ano) || hojeAno;
  const mesAtivo = Number(sp.mes) >= 1 && Number(sp.mes) <= 12 ? Number(sp.mes) : hojeMes;
  const grupoAtivo: GrupoAgenda | "todos" = FILTROS.some((f) => f.valor === sp.grupo) ? (sp.grupo as GrupoAgenda) : "todos";
  const q = sp.q ?? "";
  const responsavelAtivo = sp.responsavel ?? "";
  const base: BuscaParams = { ano: anoAtivo, mes: mesAtivo, grupo: grupoAtivo, q, responsavel: responsavelAtivo };

  const supabase = await createClient();
  // getSession() (não getUser()) — mesmo raciocínio do layout do dashboard:
  // o middleware já validou a sessão pra esta mesma requisição.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const [todosItens, contexto] = await Promise.all([
    montarPainel(supabase),
    session?.user.email ? obterContextoAcesso(supabase, session.user.email) : Promise.resolve({ tipo: "admin" as const }),
  ]);
  // Perfil restrito (Etapa 5, 30/09/2026): só vê os próprios itens, sem o
  // seletor de responsável — não faz sentido escolher "ver de outra pessoa"
  // quando o próprio acesso já é limitado ao que é seu.
  const itens = filtrarPorAcesso(todosItens, contexto);
  const podeEscolherResponsavel = contexto.tipo === "admin";

  const comData = itens.filter((i): i is ItemPainel & { prazo: string } => i.prazo !== null);
  const porGrupo = grupoAtivo === "todos" ? comData : comData.filter((i) => GRUPO_AGENDA_POR_CATEGORIA[i.categoria] === grupoAtivo);
  const porResponsavel = responsavelAtivo ? porGrupo.filter((i) => i.responsavel === responsavelAtivo) : porGrupo;
  const filtrados = q.trim() ? porResponsavel.filter((i) => i.titulo.toLowerCase().includes(q.trim().toLowerCase())) : porResponsavel;

  // Opções do filtro: catálogo conhecido + qualquer responsável digitado nos
  // itens que ainda não esteja nele (texto livre — pode crescer sozinho).
  const opcoesResponsavel = Array.from(
    new Set([...RESPONSAVEL_TAREFA_SEED, ...comData.map((i) => i.responsavel).filter((r): r is string => Boolean(r))]),
  ).sort((a, b) => a.localeCompare(b));

  const itensPorData = new Map<string, ItemPainel[]>();
  for (const item of filtrados) {
    const lista = itensPorData.get(item.prazo) ?? [];
    lista.push(item);
    itensPorData.set(item.prazo, lista);
  }
  for (const lista of itensPorData.values()) {
    lista.sort((a, b) => NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel] || a.ordenacao.localeCompare(b.ordenacao));
  }

  // Primeiro e último dia do mês ativo, em dias UTC desde a época.
  const primeiroDiaMes = Date.UTC(anoAtivo, mesAtivo - 1, 1) / 86_400_000;
  const ultimoDiaMes = Date.UTC(anoAtivo, mesAtivo, 0) / 86_400_000;
  const inicioGrade = primeiroDiaMes - (new Date(primeiroDiaMes * 86_400_000).getUTCDay());
  const fimGrade = ultimoDiaMes + (6 - new Date(ultimoDiaMes * 86_400_000).getUTCDay());

  const dias: { iso: string; noMes: boolean }[] = [];
  for (let d = inicioGrade; d <= fimGrade; d++) {
    const iso = isoDeDiasUtc(d);
    dias.push({ iso, noMes: iso.slice(5, 7) === String(mesAtivo).padStart(2, "0") });
  }

  const mesAnterior = mesAtivo === 1 ? { ano: anoAtivo - 1, mes: 12 } : { ano: anoAtivo, mes: mesAtivo - 1 };
  const mesSeguinte = mesAtivo === 12 ? { ano: anoAtivo + 1, mes: 1 } : { ano: anoAtivo, mes: mesAtivo + 1 };

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={querystring(mesAnterior, base)}
            className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 px-3 py-1.5 text-sm text-nevoa-600 hover:bg-nevoa-100 dark:text-nevoa-300 dark:hover:bg-nevoa-800"
            aria-label="Mês anterior"
          >
            ‹
          </Link>
          <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50 w-52 text-center">
            {NOMES_MES[mesAtivo - 1]} de {anoAtivo}
          </h2>
          <Link
            href={querystring(mesSeguinte, base)}
            className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 px-3 py-1.5 text-sm text-nevoa-600 hover:bg-nevoa-100 dark:text-nevoa-300 dark:hover:bg-nevoa-800"
            aria-label="Próximo mês"
          >
            ›
          </Link>
          {(anoAtivo !== hojeAno || mesAtivo !== hojeMes) && (
            <Link
              href={querystring({ ano: hojeAno, mes: hojeMes }, base)}
              className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-petroleo-600 hover:bg-nevoa-100 dark:text-petroleo-400 dark:hover:bg-nevoa-800"
            >
              Hoje
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {podeEscolherResponsavel && <ResponsavelFiltro opcoes={opcoesResponsavel} />}
          <form method="get" action="/agenda" className="flex items-center gap-2">
            <input type="hidden" name="ano" value={anoAtivo} />
            <input type="hidden" name="mes" value={mesAtivo} />
            {grupoAtivo !== "todos" && <input type="hidden" name="grupo" value={grupoAtivo} />}
            {responsavelAtivo && <input type="hidden" name="responsavel" value={responsavelAtivo} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Procurar pelo nº do processo ou título"
              className="w-72 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 px-3 py-1.5 text-sm text-nevoa-800 dark:text-nevoa-100 placeholder:text-nevoa-400 focus:outline-none focus:ring-2 focus:ring-petroleo-500"
            />
          </form>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-nevoa-200 dark:border-nevoa-800">
        {FILTROS.map((f) => {
          const contagem =
            f.valor === "todos" ? comData.length : comData.filter((i) => GRUPO_AGENDA_POR_CATEGORIA[i.categoria] === f.valor).length;
          const ativo = f.valor === grupoAtivo;
          return (
            <Link
              key={f.valor}
              href={querystring({ grupo: f.valor }, base)}
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

      <div className="grid grid-cols-7 gap-px rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-200 dark:bg-nevoa-800 overflow-hidden">
        {DIAS_SEMANA_CURTO.map((d) => (
          <div
            key={d}
            className="bg-nevoa-50 dark:bg-nevoa-900 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400"
          >
            {d}
          </div>
        ))}
        {dias.map((d) => {
          const itensDoDia = itensPorData.get(d.iso) ?? [];
          const numero = Number(d.iso.slice(8, 10));
          const ehHoje = d.iso === hoje;
          return (
            <div
              key={d.iso}
              className={`min-h-[112px] p-1.5 flex flex-col gap-1 ${
                d.noMes ? "bg-white dark:bg-nevoa-900" : "bg-nevoa-25 dark:bg-nevoa-950/40"
              }`}
            >
              <span
                className={`text-xs font-medium self-start px-1.5 rounded-full ${
                  ehHoje
                    ? "bg-petroleo-600 text-white dark:bg-petroleo-500"
                    : d.noMes
                      ? "text-nevoa-600 dark:text-nevoa-300"
                      : "text-nevoa-300 dark:text-nevoa-600"
                }`}
              >
                {numero}
              </span>
              {itensDoDia.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.titulo}
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-tight truncate transition-opacity ${GRUPO_PILL_CLASSE[GRUPO_AGENDA_POR_CATEGORIA[item.categoria]]}`}
                >
                  <span className="truncate">{item.titulo}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
