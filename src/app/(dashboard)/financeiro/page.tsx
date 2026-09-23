import Link from "next/link";
import { Wallet, HandCoins, TriangleAlert, FileText, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { montarPainel, identificarProcesso } from "@/features/central-prazos/agregador";
import { StatTile } from "@/components/ui/stat-tile";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { RankedBarList, ranquear } from "@/components/ui/ranked-bar-list";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import { SITUACAO_PROCESSO_PROPOSTA_HONORARIOS, mesclarSugestoes } from "@/features/processos/catalogos";
import { MovimentacoesPanel, type ProcessoOpcao } from "@/features/financeiro/movimentacoes-panel";
import { MovimentacoesFiltros } from "@/features/financeiro/movimentacoes-filtros";
import { MOVIMENTACAO_CATEGORIA_SEED, MOVIMENTACAO_CONTA_SEED } from "@/features/financeiro/catalogos";

type ProcessoFinanceiro = {
  id: string;
  tipo_trabalho: "pericia_judicial" | "assistencia_tecnica";
  situacao_processo: string | null;
  situacao_financeira: string | null;
  numero_processo: string | null;
  periciando_nome: string | null;
  parte_autora: string | null;
  honorario_apresentado: number | null;
  honorario_arbitrado: number | null;
  liberacao_solicitada_em: string | null;
  honorarios_recebidos_em: string | null;
  honorarios_proximo_marco_em: string | null;
  honorarios_proximo_marco_descricao: string | null;
  honorarios_forma_pagamento: string | null;
  honorarios_vencimento: string | null;
  nota_fiscal_emitida: "sim" | "nao" | null;
  nota_fiscal_numero: string | null;
};

/** Duplicado de propósito (mesmo helper existe em processos/[id]/page.tsx) — é pouca coisa pra justificar um util compartilhado por 2 telas. */
function moedaBRL(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Valor de honorário judicial "que vale": arbitrado (fixado pelo juízo) quando existe, senão o apresentado (proposta da perita). */
function valorHonorarioJudicial(p: ProcessoFinanceiro): number | null {
  return p.honorario_arbitrado ?? p.honorario_apresentado;
}

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
}

/** Primeiro valor não-vazio de um search param (Next entrega string | string[] | undefined). */
function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function ListaProcessos({
  itens,
  vazio,
  linha,
}: {
  itens: ProcessoFinanceiro[];
  vazio: string;
  linha: (p: ProcessoFinanceiro) => { texto: string; detalhe: string };
}) {
  if (itens.length === 0) {
    return <p className="text-sm text-nevoa-500 dark:text-nevoa-400">{vazio}</p>;
  }
  return (
    <ul className="space-y-2">
      {itens.map((p) => {
        const { texto, detalhe } = linha(p);
        return (
          <li key={p.id}>
            <Link
              href={`/processos/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-nevoa-50 dark:hover:bg-nevoa-900/40"
            >
              <span className="min-w-0 truncate text-sm text-nevoa-800 dark:text-nevoa-200">{texto}</span>
              <span className="shrink-0 text-sm font-medium text-nevoa-900 dark:text-nevoa-100 tabular-nums">{detalhe}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Financeiro — painel consolidado, majoritariamente só leitura (os
 * honorários continuam sendo editados no cadastro de cada processo).
 * Reaproveita a MESMA fonte da Central de Prazos (`montarPainel`) pra
 * Inadimplência, em vez de duplicar a lógica de atraso — mesmo princípio
 * já usado pela Agenda.
 *
 * "Propostas" aqui é financeiro (processos judiciais com situação
 * "Proposta de honorários" aguardando resposta) — não confundir com
 * "Propostas" comercial do CRM (Leads/Propostas), que é um pedido
 * diferente e maior, ainda travado na decisão de papéis/permissões (ver
 * memória [[fila-melhorias-set-2026-parte2]]).
 *
 * "Movimentações" (antiga "Saídas"/despesas) virou ledger único de
 * entrada/saída em 23/09/2026, a pedido do financeiro dela — pra bater
 * com o extrato bancário (data, tipo, categoria, conta, processo
 * vinculado, valor, observações). Entrada é SEMPRE vinculada a um
 * processo (decisão dela); saída pode ou não ter. 100% manual — nenhuma
 * automação a partir de honorarios_recebidos_em/situacao_financeira.
 * Filtro na lista (mesmo padrão visual de ProcessosFiltros) aplicado em
 * memória sobre a lista JÁ carregada — o total de "Saídas" no topo
 * continua vindo do total NÃO filtrado, pra ser um KPI estável.
 * "Relatórios" (da lista original) continua de fora — formato nunca foi
 * definido. Sinalizado na própria tela, não é esquecimento.
 */
export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filtro = {
    processo: param(sp.mov_processo).toLowerCase(),
    tipo: param(sp.mov_tipo),
    conta: param(sp.mov_conta),
    categoria: param(sp.mov_categoria),
    dataInicial: param(sp.mov_data_inicial),
    dataFinal: param(sp.mov_data_final),
  };

  const supabase = await createClient();

  const [{ data: processosDb, error: erroProcessos }, itensPainel, { data: movimentacoesDb, error: erroMovimentacoes }] =
    await Promise.all([
      supabase
        .from("processos")
        .select(
          "id, tipo_trabalho, situacao_processo, situacao_financeira, numero_processo, periciando_nome, parte_autora, honorario_apresentado, honorario_arbitrado, liberacao_solicitada_em, honorarios_recebidos_em, honorarios_proximo_marco_em, honorarios_proximo_marco_descricao, honorarios_forma_pagamento, honorarios_vencimento, nota_fiscal_emitida, nota_fiscal_numero",
        ),
      montarPainel(supabase),
      supabase.from("movimentacoes_financeiras").select("*").order("data", { ascending: false }),
    ]);
  if (erroProcessos) console.error("Financeiro: falha ao buscar processos:", erroProcessos.message);
  if (erroMovimentacoes) console.error("Financeiro: falha ao buscar movimentações:", erroMovimentacoes.message);

  const processos: ProcessoFinanceiro[] = processosDb ?? [];
  const judiciais = processos.filter((p) => p.tipo_trabalho === "pericia_judicial");
  const at = processos.filter((p) => p.tipo_trabalho === "assistencia_tecnica");

  const judiciaisAReceber = judiciais.filter((p) => !p.honorarios_recebidos_em && valorHonorarioJudicial(p) != null);
  const judiciaisRecebidos = judiciais
    .filter((p) => p.honorarios_recebidos_em)
    .sort((a, b) => (b.honorarios_recebidos_em ?? "").localeCompare(a.honorarios_recebidos_em ?? ""));
  const propostas = judiciais.filter((p) => p.situacao_processo === SITUACAO_PROCESSO_PROPOSTA_HONORARIOS);

  const totalAReceberJudicial = judiciaisAReceber.reduce((soma, p) => soma + (valorHonorarioJudicial(p) ?? 0), 0);
  const totalRecebidoJudicial = judiciaisRecebidos.reduce((soma, p) => soma + (valorHonorarioJudicial(p) ?? 0), 0);
  const atPendentes = at.filter((p) => p.situacao_financeira !== "Pago").length;

  // Mesma fonte/lógica da Central de Prazos — nunca reinventar aqui quem está em atraso.
  const inadimplenciaAT = itensPainel.filter((i) => i.categoria === "honorarios_atraso_at");
  const marcosJudiciaisProximos = itensPainel.filter((i) => i.categoria === "honorarios_marco_judicial");

  const porSituacaoFinanceiraJudicial = ranquear(judiciais.map((p) => p.situacao_financeira));
  const porSituacaoFinanceiraAT = ranquear(at.map((p) => p.situacao_financeira));

  const processosOpcoes: ProcessoOpcao[] = processos.map((p) => ({ id: p.id, label: identificarProcesso(p) }));
  const processoPorId = new Map(processos.map((p) => [p.id, p]));

  const movimentacoes = movimentacoesDb ?? [];
  // KPI "Saídas" no topo é sempre do total NÃO filtrado — não deve mudar
  // conforme ela mexe no filtro da lista abaixo.
  const totalSaidas = movimentacoes.filter((m) => m.tipo === "saida").reduce((soma, m) => soma + m.valor, 0);

  const categoriasSugestoes = mesclarSugestoes(
    MOVIMENTACAO_CATEGORIA_SEED,
    movimentacoes.map((m) => m.categoria),
  );
  const contasSugestoes = mesclarSugestoes(
    MOVIMENTACAO_CONTA_SEED,
    movimentacoes.map((m) => m.conta),
  );

  const movimentacoesFiltradas = movimentacoes.filter((m) => {
    if (filtro.tipo && m.tipo !== filtro.tipo) return false;
    if (filtro.conta && m.conta !== filtro.conta) return false;
    if (filtro.categoria && m.categoria !== filtro.categoria) return false;
    if (filtro.dataInicial && m.data < filtro.dataInicial) return false;
    if (filtro.dataFinal && m.data > filtro.dataFinal) return false;
    if (filtro.processo) {
      const processo = m.processo_id ? processoPorId.get(m.processo_id) : null;
      const label = processo ? identificarProcesso(processo).toLowerCase() : "";
      if (!label.includes(filtro.processo)) return false;
    }
    return true;
  });

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Financeiro</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Visão consolidada do financeiro da operação — os honorários continuam sendo cadastrados por processo, aqui
          é leitura; as movimentações abaixo são um ledger manual à parte.
        </p>
      </div>

      {(erroProcessos || erroMovimentacoes) && (
        <BannerErroConsulta mensagem="Não consegui carregar tudo agora — os números abaixo podem estar incompletos." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatTile
          rotulo="A receber (Judicial)"
          valor={moedaBRL(totalAReceberJudicial)}
          icone={<Wallet className="h-5 w-5" />}
        />
        <StatTile
          rotulo="Recebido (Judicial)"
          valor={moedaBRL(totalRecebidoJudicial)}
          icone={<HandCoins className="h-5 w-5" />}
        />
        <StatTile rotulo="Saídas" valor={moedaBRL(totalSaidas)} icone={<TrendingDown className="h-5 w-5" />} />
        <StatTile rotulo="AT pendentes" valor={atPendentes} icone={<TriangleAlert className="h-5 w-5" />} />
        <StatTile rotulo="Propostas em aberto" valor={propostas.length} icone={<FileText className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard titulo="A Receber" subtitulo="Judicial — honorário arbitrado (ou apresentado) ainda não recebido">
          <ListaProcessos
            itens={judiciaisAReceber}
            vazio="Nenhum honorário judicial pendente de recebimento."
            linha={(p) => ({
              texto: identificarProcesso(p),
              detalhe: moedaBRL(valorHonorarioJudicial(p)),
            })}
          />
        </DashboardCard>

        <DashboardCard titulo="Recebidos" subtitulo="Judicial — mais recentes primeiro; NF = nota fiscal emitida">
          <ListaProcessos
            itens={judiciaisRecebidos}
            vazio="Nenhum recebimento confirmado ainda."
            linha={(p) => ({
              texto: identificarProcesso(p),
              detalhe: `${moedaBRL(valorHonorarioJudicial(p))} · ${dataCurta(p.honorarios_recebidos_em!)} · ${
                p.nota_fiscal_emitida === "sim" ? `NF nº ${p.nota_fiscal_numero}` : "sem NF"
              }`,
            })}
          />
        </DashboardCard>

        <DashboardCard titulo="Propostas" subtitulo='Judicial — situação "Proposta de honorários"'>
          <ListaProcessos
            itens={propostas}
            vazio="Nenhuma proposta de honorários em aberto."
            linha={(p) => ({
              texto: identificarProcesso(p),
              detalhe: moedaBRL(p.honorario_apresentado),
            })}
          />
        </DashboardCard>

        <DashboardCard titulo="Próximos marcos" subtitulo="Judicial — data combinada de pagamento, mais próxima primeiro">
          {marcosJudiciaisProximos.length === 0 ? (
            <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum marco de pagamento combinado no momento.</p>
          ) : (
            <ul className="space-y-2">
              {marcosJudiciaisProximos.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-nevoa-50 dark:hover:bg-nevoa-900/40"
                  >
                    <span className="min-w-0 truncate text-sm text-nevoa-800 dark:text-nevoa-200">
                      {item.titulo.replace("Próximo marco de honorários — ", "")}
                      {item.subtitulo ? ` · ${item.subtitulo}` : ""}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-nevoa-900 dark:text-nevoa-100 tabular-nums">
                      {item.prazo ? dataCurta(item.prazo) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard titulo="Serviços AT" subtitulo="Situação financeira — Pago / Não pago / Em parcelamento">
          <RankedBarList itens={porSituacaoFinanceiraAT} />
        </DashboardCard>

        <DashboardCard titulo="Inadimplência" subtitulo="AT — boleto/transferência vencidos e ainda não pagos">
          {inadimplenciaAT.length === 0 ? (
            <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum pagamento de AT em atraso no momento.</p>
          ) : (
            <ul className="space-y-2">
              {inadimplenciaAT.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-nevoa-50 dark:hover:bg-nevoa-900/40"
                  >
                    <span className="min-w-0 truncate text-sm text-nevoa-800 dark:text-nevoa-200">{item.titulo}</span>
                    <span className="shrink-0 text-sm font-medium text-vinho-600 dark:text-vinho-400 tabular-nums">
                      {item.prazo ? dataCurta(item.prazo) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard titulo="Honorários Judiciais" subtitulo="Distribuição por situação financeira">
          <RankedBarList itens={porSituacaoFinanceiraJudicial} />
        </DashboardCard>
      </div>

      <div>
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50 mb-1">Movimentações</h2>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-4">
          Ledger manual de entrada e saída, pra bater com o extrato bancário (Asaas/Inter/Banco do Brasil).
        </p>
        <div className="space-y-4">
          <MovimentacoesFiltros categorias={categoriasSugestoes} contas={contasSugestoes} />
          <MovimentacoesPanel
            movimentacoes={movimentacoesFiltradas}
            processosOpcoes={processosOpcoes}
            categoriasSugestoes={categoriasSugestoes}
            contasSugestoes={contasSugestoes}
          />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-5 py-4 text-sm text-nevoa-500 dark:text-nevoa-400">
        <strong className="text-nevoa-700 dark:text-nevoa-300">Ainda não incluído:</strong> Relatórios (formato ainda
        não definido).
      </div>
    </main>
  );
}
