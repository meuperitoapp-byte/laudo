import Link from "next/link";
import { FolderKanban, CalendarClock, ListChecks, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { montarPainel } from "@/features/central-prazos/agregador";
import { hojeIsoBrasil } from "@/features/central-prazos/regras";
import { RankedBarList, ranquear } from "@/components/ui/ranked-bar-list";
import { DonutChart } from "@/components/ui/donut-chart";
import { StatTile } from "@/components/ui/stat-tile";
import { DashboardCard } from "@/components/ui/dashboard-card";

/**
 * Dashboard — porta de entrada analítica do sistema (pedido da Dra.
 * Fernanda: "cara de sistema, gráficos, dashboard profissional"). Distinto
 * de `/hoje` (lista acionável do que fazer agora) — aqui é visão geral e
 * distribuição, não fila de providências.
 *
 * Distribuições com muitas categorias (situação do processo chega a 13
 * valores) usam lista de barras ranqueadas, não donut — mais de ~7 fatias
 * num donut vira ilegível bem antes disso (ver skill de dataviz, "choosing
 * a form"). Cor única DENTRO de cada lista: o trabalho ali é comparar
 * MAGNITUDE entre categorias, não identidade — dispensa paleta categórica
 * inteira. A única exceção é "Perícia Judicial × Assistência Técnica": só 2
 * categorias, divisão de um TODO — aí sim é donut (ver DonutChart).
 *
 * Cor por CARTÃO alterna entre as 2 cores de gráfico já validadas
 * (--chart-teal/--chart-amber, ver globals.css) — feedback dela em
 * 24/09/2026 ("muito feio, tudo igual"). Nunca uma cor nova inventada.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const hoje = hojeIsoBrasil();

  // As 3 consultas abaixo são independentes — nenhuma usa dado de outra —
  // então disparam juntas em vez de uma atrás da outra. `escritoriosDb`
  // continua numa QUERY separada de propósito (se algo estiver errado só
  // nessa coluna, ex.: migration ainda não propagada, o resto do dashboard
  // continua de pé), mas "separada" e "sequencial" são coisas diferentes —
  // rodar em paralelo não muda o isolamento de erro. Corrigido em 22/09/2026
  // (relato de lentidão ao trocar de módulo).
  const [
    { data: processosDb, error: erroProcessos },
    itensPainel,
    { data: escritoriosDb, error: erroEscritorios },
  ] = await Promise.all([
    supabase
      .from("processos")
      .select(
        "id, tipo_trabalho, status, situacao_processo, situacao_financeira, aceitou_nomeacao, agendamento_data, honorarios_forma_pagamento",
      ),
    montarPainel(supabase),
    supabase.from("processos").select("escritorio_indicacao"),
  ]);
  if (erroProcessos) {
    // Nunca deixa isso virar "0 processos" silencioso — o erro cru é mais
    // útil que um dashboard com números falsos.
    console.error("Dashboard: falha ao buscar processos:", erroProcessos.message);
  }
  const processos = processosDb ?? [];
  const ativos = processos.filter((p) => p.status === "em_andamento");

  if (erroEscritorios) {
    console.error("Dashboard: falha ao buscar escritorio_indicacao:", erroEscritorios.message);
  }

  const totalProcessos = processos.length;
  const emAndamento = ativos.length;
  const periciasProximas = ativos.filter((p) => p.agendamento_data && p.agendamento_data >= hoje).length;
  const pendenciasAbertas = itensPainel.length;

  const porSituacaoProcesso = ranquear(ativos.map((p) => p.situacao_processo));
  const ativosPericiaJudicial = ativos.filter((p) => p.tipo_trabalho === "pericia_judicial");
  const porSituacaoFinanceira = ranquear(ativosPericiaJudicial.map((p) => p.situacao_financeira));
  const porSituacaoFinanceiraTotal = ativosPericiaJudicial.length;
  // Item #10 da fila de melhorias (19-20/09/2026): ela perguntou se dava pra
  // totalizar a situação financeira da Assistência Técnica também (ex.: "AT -
  // Maria José - parcelado em 5x - cartão" / "AT - João da Silva - pago -
  // pix"). Categoria (Pago/Não pago/Em parcelamento) já existia; forma de
  // pagamento (cartão/pix/boleto/transferência/outro) entrou com a migration
  // de honorários em atraso (21/09/2026) — completa o pedido original dela.
  const ativosAT = ativos.filter((p) => p.tipo_trabalho === "assistencia_tecnica");
  const porSituacaoFinanceiraAT = ranquear(ativosAT.map((p) => p.situacao_financeira));
  const porFormaPagamentoAT = ranquear(ativosAT.map((p) => p.honorarios_forma_pagamento));
  const porTipoTrabalho = ranquear(
    ativos.map((p) => (p.tipo_trabalho === "assistencia_tecnica" ? "Assistência Técnica" : "Perícia Judicial")),
  );
  // Única distribuição que é de fato uma divisão de um TODO em poucas partes
  // (2 categorias) — por isso é a única que vira donut no dashboard, não
  // lista de barras (ver comentário de RankedBarList).
  const CORES_TIPO_TRABALHO: Record<string, string> = {
    "Perícia Judicial": "var(--chart-teal)",
    "Assistência Técnica": "var(--chart-amber)",
  };
  const donutTipoTrabalho = porTipoTrabalho.map((item) => ({ ...item, cor: CORES_TIPO_TRABALHO[item.rotulo] ?? "var(--chart-teal)" }));
  const porEscritorio = ranquear((escritoriosDb ?? []).map((p) => p.escritorio_indicacao), "Sem indicação registrada").slice(
    0,
    8,
  );

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Dashboard</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">Visão geral dos processos e da operação.</p>
      </div>

      {erroProcessos && (
        <div className="rounded-xl border border-vinho-400/60 dark:border-vinho-600/40 bg-vinho-100 dark:bg-vinho-950/30 px-4 py-3 text-sm text-vinho-700 dark:text-vinho-300">
          Não consegui carregar os processos: {erroProcessos.message}. Os números abaixo não são confiáveis até isso
          ser corrigido.
        </div>
      )}

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
        <DashboardCard titulo="Situação do processo" subtitulo={`${emAndamento} processos em andamento`} total={emAndamento}>
          <RankedBarList itens={porSituacaoProcesso} cor="var(--chart-teal)" />
        </DashboardCard>

        <DashboardCard titulo="Situação financeira — Perícia Judicial" total={porSituacaoFinanceiraTotal}>
          <RankedBarList itens={porSituacaoFinanceira} cor="var(--chart-amber)" />
        </DashboardCard>

        <DashboardCard
          titulo="Situação financeira — Assistência Técnica"
          subtitulo="Pago / Não pago / Em parcelamento"
          total={ativosAT.length}
        >
          <RankedBarList itens={porSituacaoFinanceiraAT} cor="var(--chart-teal)" />
        </DashboardCard>

        <DashboardCard
          titulo="Forma de pagamento — Assistência Técnica"
          subtitulo="Cartão e Pix não geram cobrança; Boleto e Transferência entram na Central de Prazos"
          total={ativosAT.length}
        >
          <RankedBarList itens={porFormaPagamentoAT} cor="var(--chart-amber)" />
        </DashboardCard>

        <DashboardCard titulo="Perícia Judicial × Assistência Técnica" total={emAndamento}>
          <DonutChart itens={donutTipoTrabalho} />
        </DashboardCard>

        <DashboardCard titulo="Escritórios que mais indicam" subtitulo="Top 8 — de onde vêm os casos" total={escritoriosDb?.length ?? 0}>
          {erroEscritorios ? (
            <p className="text-sm text-vinho-600 dark:text-vinho-400">Erro ao carregar: {erroEscritorios.message}</p>
          ) : (
            <RankedBarList itens={porEscritorio} cor="var(--chart-amber)" />
          )}
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
