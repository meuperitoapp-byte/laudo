import Link from "next/link";
import type { ReactNode } from "react";
import { FolderKanban, CalendarClock, ListChecks, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { montarPainel } from "@/features/central-prazos/agregador";
import { hojeIsoBrasil } from "@/features/central-prazos/regras";
import { RankedBarList, type ItemBarra } from "@/components/ui/ranked-bar-list";
import { StatTile } from "@/components/ui/stat-tile";

/** Conta ocorrências de um valor (texto livre, pode ser null) e devolve ranqueado, maior primeiro. */
function ranquear(valores: (string | null)[], rotuloVazio = "Não informado"): ItemBarra[] {
  const contagem = new Map<string, number>();
  for (const v of valores) {
    const chave = v?.trim() || rotuloVazio;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function DashboardCard({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-5">
      <div className="mb-4">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h2>
        {subtitulo && <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Dashboard — porta de entrada analítica do sistema (pedido da Dra.
 * Fernanda: "cara de sistema, gráficos, dashboard profissional"). Distinto
 * de `/hoje` (lista acionável do que fazer agora) — aqui é visão geral e
 * distribuição, não fila de providências.
 *
 * Distribuições com muitas categorias (situação do processo chega a 13
 * valores) usam lista de barras ranqueadas, não donut — mais de ~7 fatias
 * num donut vira ilegível bem antes disso (ver skill de dataviz, "choosing
 * a form"). Cor única por lista: o trabalho aqui é comparar MAGNITUDE entre
 * categorias, não identidade — dispensa paleta categórica inteira.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const hoje = hojeIsoBrasil();

  const [{ data: processosDb }, itensPainel] = await Promise.all([
    supabase
      .from("processos")
      .select(
        "id, tipo_trabalho, status, situacao_processo, situacao_financeira, aceitou_nomeacao, agendamento_data, escritorio_indicacao",
      ),
    montarPainel(supabase),
  ]);
  const processos = processosDb ?? [];
  const ativos = processos.filter((p) => p.status === "em_andamento");

  const totalProcessos = processos.length;
  const emAndamento = ativos.length;
  const periciasProximas = ativos.filter((p) => p.agendamento_data && p.agendamento_data >= hoje).length;
  const pendenciasAbertas = itensPainel.length;

  const porSituacaoProcesso = ranquear(ativos.map((p) => p.situacao_processo));
  const porSituacaoFinanceira = ranquear(
    ativos.filter((p) => p.tipo_trabalho === "pericia_judicial").map((p) => p.situacao_financeira),
  );
  const porTipoTrabalho = ranquear(
    ativos.map((p) => (p.tipo_trabalho === "assistencia_tecnica" ? "Assistência Técnica" : "Perícia Judicial")),
  );
  const porEscritorio = ranquear(processos.map((p) => p.escritorio_indicacao), "Sem indicação registrada").slice(0, 8);

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Dashboard</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">Visão geral dos processos e da operação.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile rotulo="Processos" valor={totalProcessos} icone={<FolderKanban className="h-5 w-5" />} href="/processos" />
        <StatTile rotulo="Em andamento" valor={emAndamento} icone={<Scale className="h-5 w-5" />} href="/processos" />
        <StatTile
          rotulo="Perícias agendadas"
          valor={periciasProximas}
          icone={<CalendarClock className="h-5 w-5" />}
          href="/hoje"
        />
        <StatTile rotulo="Pendências abertas" valor={pendenciasAbertas} icone={<ListChecks className="h-5 w-5" />} href="/hoje" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard titulo="Situação do processo" subtitulo={`${emAndamento} processos em andamento`}>
          <RankedBarList itens={porSituacaoProcesso} />
        </DashboardCard>

        <DashboardCard
          titulo="Situação financeira"
          subtitulo="Só Perícia Judicial — Assistência Técnica usa catálogo próprio (Pago/Não pago/Em parcelamento)"
        >
          <RankedBarList itens={porSituacaoFinanceira} />
        </DashboardCard>

        <DashboardCard titulo="Perícia Judicial × Assistência Técnica">
          <RankedBarList itens={porTipoTrabalho} />
        </DashboardCard>

        <DashboardCard titulo="Escritórios que mais indicam" subtitulo="Top 8 — de onde vêm os casos">
          <RankedBarList itens={porEscritorio} />
        </DashboardCard>
      </div>

      <p className="text-xs text-nevoa-400 dark:text-nevoa-600 text-center pt-2">
        <Link href="/processos" className="hover:underline">
          Ver todos os processos →
        </Link>
      </p>
    </main>
  );
}
