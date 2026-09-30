import Link from "next/link";
import { Eye, Pencil, FileText, Clock, CheckCircle2, ListChecks, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { ProcessosFiltros } from "@/features/processos/processos-filtros";
import { ExcluirProcessoButton } from "@/features/processos/excluir-processo-button";
import { KpiTendenciaCard } from "@/components/ui/kpi-tendencia-card";
import { DonutChart } from "@/components/ui/donut-chart";
import { BarChartSimples } from "@/components/ui/bar-chart-simples";
import { EvolucaoMensalChart } from "@/components/ui/evolucao-mensal-chart";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { montarPainel } from "@/features/central-prazos/agregador";
import { filtrarPorAcesso, ordenarPainel } from "@/features/central-prazos/regras";
import { ItemCard } from "@/features/central-prazos/item-card";
import { percentualVariacao, isoHaDias, novosPorMes } from "@/features/processos/metricas-tendencia";
import {
  SITUACOES_FINANCEIRAS_SEED,
  mesclarSugestoes,
  varianteSituacaoProcesso,
  ETAPA_CONTRATADA_ROTULOS,
  ETAPAS_CONTRATADAS_ORDENADAS,
} from "@/features/processos/catalogos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import { valorDoProcesso } from "@/features/processos/valor";
import { obterContextoAcesso, temAcessoAoModulo } from "@/features/acessos/contexto";
import type { TipoTrabalhoProcesso } from "@/types/enums";

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

const ITENS_POR_PAGINA = 10;

/** Primeiro valor não-vazio de um search param (Next entrega string | string[] | undefined). */
function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function moedaBRL(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = {
    numero: param(sp.numero),
    periciando: param(sp.periciando),
    tipoLaudo: param(sp.tipo_laudo),
    tipoTrabalho: param(sp.tipo_trabalho),
    // situacao ausente = padrão (esconde "Finalizado"); "todos" = sem filtro
    // de situação; qualquer outro valor = etapa exata do pipeline.
    situacao: param(sp.situacao),
    situacaoFinanceira: param(sp.situacao_financeira),
    comarca: param(sp.comarca),
    dataInicial: param(sp.data_inicial),
    dataFinal: param(sp.data_final),
  };
  const pagina = Math.max(1, parseInt(param(sp.pagina), 10) || 1);

  const supabase = await createClient();

  // Tela simplificada pra perfil restrito sem acesso ao Financeiro (pedido
  // dela, 30/09/2026: "prefiro que na tela dela fique as atividades que ela
  // precisa cumprir... ela tem TDAH, se perde" + "essa receita estimada
  // também não deve aparecer pra ela"). Quem tem Financeiro liberado (ex.:
  // perfil do Bernardo) continua vendo o painel completo — a régua é acesso
  // ao módulo, não uma lista fixa de nomes.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const contexto = session?.user.email ? await obterContextoAcesso(supabase, session.user.email) : { tipo: "admin" as const };
  const painelSimplificado = contexto.tipo === "restrito" && !temAcessoAoModulo(contexto, "financeiro");

  if (painelSimplificado) {
    const itensPainel = ordenarPainel(filtrarPorAcesso(await montarPainel(supabase), contexto));
    return (
      <main className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Casos</h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">O que você precisa cumprir nos casos em andamento.</p>
        </div>
        {itensPainel.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-14 text-center">
            <CheckCircle2 className="h-8 w-8 text-musgo-600 dark:text-musgo-400" />
            <p className="text-sm text-nevoa-600 dark:text-nevoa-400 max-w-sm">Nada pendente pra você no momento.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {itensPainel.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ol>
        )}
      </main>
    );
  }

  let query = supabase.from("processos").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (f.situacao === "") {
    // Processos novos ainda sem situacao_processo definida continuam
    // aparecendo na visão padrão — só "Finalizado" some.
    query = query.or("situacao_processo.is.null,situacao_processo.neq.Finalizado");
  } else if (f.situacao !== "todos") {
    query = query.eq("situacao_processo", f.situacao);
  }
  if (f.numero) query = query.ilike("numero_processo", `%${f.numero}%`);
  if (f.periciando) query = query.ilike("periciando_nome", `%${f.periciando}%`);
  if (f.tipoLaudo) query = query.eq("tipo_laudo_id", f.tipoLaudo);
  if (f.tipoTrabalho) query = query.eq("tipo_trabalho", f.tipoTrabalho as TipoTrabalhoProcesso);
  if (f.situacaoFinanceira) query = query.eq("situacao_financeira", f.situacaoFinanceira);
  if (f.comarca) query = query.ilike("comarca_subsecao", `%${f.comarca}%`);
  if (f.dataInicial) query = query.gte("created_at", f.dataInicial);
  if (f.dataFinal) query = query.lte("created_at", `${f.dataFinal}T23:59:59.999Z`);
  query = query.range((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA - 1);

  const [
    { data: processos, count: totalFiltrado, error: erroProcessos },
    { data: tiposLaudo, error: erroTiposLaudo },
    { data: partesDb, error: erroPartes },
    { data: financeirasDb, error: erroFinanceiras },
    { data: protocoladosDb, error: erroProtocolados },
    // KPIs/gráficos do topo são SEMPRE sobre o total real (sem os filtros da
    // lista abaixo) — mesmo princípio do Dashboard: um filtro na tabela não
    // pode fazer o "Total de demandas" mentir.
    { data: todosProcessosDb, error: erroTodos },
    itensPainel,
  ] = await Promise.all([
    query,
    supabase.from("tipos_laudo").select("id, nome").order("ordem", { ascending: true }),
    supabase.from("processo_partes").select("processo_id, polo, nome, ordem").eq("polo", "ativo").order("ordem"),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    // Mesmo gate de exclusão do detalhe do processo (ver [id]/page.tsx):
    // qualquer documento protocolado bloqueia excluir. Buscado em lote aqui
    // pra ExcluirProcessoButton, sem duplicar a query por linha da tabela.
    supabase.from("laudos_gerados").select("processo_id").eq("protocolado", true),
    supabase.from("processos").select("tipo_trabalho, status, created_at, honorario_arbitrado, honorario_apresentado, valor_processo"),
    montarPainel(supabase),
  ]);
  // Mesma classe de bug do dashboard "0 processos" (21/09/2026): sem checar
  // `error`, a lista principal falhando viraria "Nenhum processo em
  // andamento" — estado vazio normal, mas enganoso.
  if (erroProcessos) console.error("Processos: falha ao listar:", erroProcessos.message);
  if (erroTiposLaudo) console.error("Processos: falha ao buscar tipos de laudo:", erroTiposLaudo.message);
  if (erroPartes) console.error("Processos: falha ao buscar partes:", erroPartes.message);
  if (erroFinanceiras) console.error("Processos: falha ao buscar situações financeiras:", erroFinanceiras.message);
  if (erroProtocolados) console.error("Processos: falha ao buscar documentos protocolados:", erroProtocolados.message);
  if (erroTodos) console.error("Processos: falha ao buscar KPIs:", erroTodos.message);

  const nomePorTipoLaudo = new Map((tiposLaudo ?? []).map((t) => [t.id, t.nome]));
  const primeiroNomePoloAtivoPorProcesso = new Map<string, string>();
  for (const parte of partesDb ?? []) {
    if (!primeiroNomePoloAtivoPorProcesso.has(parte.processo_id)) {
      primeiroNomePoloAtivoPorProcesso.set(parte.processo_id, parte.nome);
    }
  }
  // Erro na consulta de protocolados NUNCA pode virar "nenhum protocolado" —
  // isso liberaria a exclusão de processos que na verdade tem documento
  // protocolado. `null` sinaliza "não sei" pro botão tratar como bloqueado.
  const processosComDocumentoProtocolado = erroProtocolados
    ? null
    : new Set((protocoladosDb ?? []).map((l) => l.processo_id));

  const filtrouAlgo = Object.values(f).some((v) => v);

  // ---- KPIs e gráficos (modelo de tela enviado pela Dra. Fernanda, 25/09/2026) ----
  const todos = todosProcessosDb ?? [];
  const emAndamento = todos.filter((p) => p.status === "em_andamento");
  const finalizados = todos.filter((p) => p.status === "finalizado");
  const arquivados = todos.filter((p) => p.status === "arquivado");
  const pendenciasAbertas = itensPainel.length;
  const receitaEstimada = emAndamento.reduce((soma, p) => soma + (valorDoProcesso(p) ?? 0), 0);

  const haUmMes = isoHaDias(30);
  const trendTotal = percentualVariacao(todos.length, todos.filter((p) => p.created_at.slice(0, 10) <= haUmMes).length);
  const trendEmAndamento = percentualVariacao(emAndamento.length, emAndamento.filter((p) => p.created_at.slice(0, 10) <= haUmMes).length);
  const trendFinalizados = percentualVariacao(finalizados.length, finalizados.filter((p) => p.created_at.slice(0, 10) <= haUmMes).length);
  const trendReceita = percentualVariacao(
    receitaEstimada,
    emAndamento.filter((p) => p.created_at.slice(0, 10) <= haUmMes).reduce((soma, p) => soma + (valorDoProcesso(p) ?? 0), 0),
  );

  const CORES_TIPO_TRABALHO: Record<string, string> = {
    "Perícia Judicial": "var(--chart-teal)",
    "Assistência Técnica": "var(--chart-amber)",
  };
  const totalJudicial = todos.filter((p) => p.tipo_trabalho === "pericia_judicial").length;
  const totalAT = todos.filter((p) => p.tipo_trabalho === "assistencia_tecnica").length;
  const donutTipoTrabalho = [
    { rotulo: "Perícia Judicial", valor: totalJudicial, cor: CORES_TIPO_TRABALHO["Perícia Judicial"] },
    { rotulo: "Assistência Técnica", valor: totalAT, cor: CORES_TIPO_TRABALHO["Assistência Técnica"] },
  ].filter((d) => d.valor > 0);

  const porSituacao = [
    { rotulo: "Em andamento", valor: emAndamento.length },
    { rotulo: "Finalizadas", valor: finalizados.length },
    { rotulo: "Pendências", valor: pendenciasAbertas },
    { rotulo: "Arquivadas", valor: arquivados.length },
  ];

  const demandasPorMes = novosPorMes(todos.map((p) => p.created_at), 6);

  const totalPaginas = Math.max(1, Math.ceil((totalFiltrado ?? 0) / ITENS_POR_PAGINA));

  // Com o filtro de tipo de trabalho ativo (o usuário chegou aqui pela tela de
  // escolha), "Novo processo" já leva o tipo pro formulário; sem filtro, cai na
  // tela de escolha.
  const hrefNovo =
    f.tipoTrabalho === "pericia_judicial" || f.tipoTrabalho === "assistencia_tecnica"
      ? `/processos/novo?tipo=${f.tipoTrabalho}`
      : "/processos/novo";

  /** Preserva os filtros atuais ao trocar de página. */
  function hrefPagina(p: number): string {
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(sp)) {
      if (chave === "pagina") continue;
      const v = param(valor);
      if (v) params.set(chave, v);
    }
    params.set("pagina", String(p));
    return `/processos?${params.toString()}`;
  }

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Demandas</h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
            Gerencie e acompanhe todas as demandas e solicitações de perícias.
          </p>
        </div>
        <Link href={hrefNovo} className={classesBotao("primaria")}>
          Nova demanda
        </Link>
      </div>

      {(erroProcessos || erroTodos) && (
        <BannerErroConsulta mensagem="Não consegui carregar tudo agora. Os números e a lista abaixo podem estar incompletos." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiTendenciaCard
          rotulo="Total de demandas"
          valor={todos.length}
          icone={<FileText className="h-5 w-5" />}
          tendencia={{ percentual: trendTotal, cor: trendTotal >= 0 ? "sucesso" : "erro" }}
        />
        <KpiTendenciaCard
          rotulo="Em andamento"
          valor={emAndamento.length}
          icone={<Clock className="h-5 w-5" />}
          tendencia={{ percentual: trendEmAndamento, cor: trendEmAndamento >= 0 ? "sucesso" : "erro" }}
        />
        <KpiTendenciaCard
          rotulo="Finalizadas"
          valor={finalizados.length}
          icone={<CheckCircle2 className="h-5 w-5" />}
          tendencia={{ percentual: trendFinalizados, cor: trendFinalizados >= 0 ? "sucesso" : "erro" }}
        />
        <KpiTendenciaCard rotulo="Pendências" valor={pendenciasAbertas} icone={<ListChecks className="h-5 w-5" />} href="/hoje" />
        <KpiTendenciaCard
          rotulo="Receita estimada"
          valor={moedaBRL(receitaEstimada)}
          icone={<Wallet className="h-5 w-5" />}
          tendencia={{ percentual: trendReceita, cor: trendReceita >= 0 ? "sucesso" : "erro" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardCard titulo="Demandas por tipo de trabalho" total={totalJudicial + totalAT}>
          <DonutChart itens={donutTipoTrabalho} />
        </DashboardCard>
        <DashboardCard titulo="Demandas por situação">
          <BarChartSimples dados={porSituacao} />
        </DashboardCard>
        <DashboardCard titulo="Demandas por mês" subtitulo="Últimos 6 meses">
          <EvolucaoMensalChart dados={demandasPorMes} />
        </DashboardCard>
      </div>

      <ProcessosFiltros
        tiposLaudo={tiposLaudo ?? []}
        situacoesFinanceiras={mesclarSugestoes(SITUACOES_FINANCEIRAS_SEED, financeirasDb)}
      />

      {!processos || processos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          {erroProcessos
            ? "Não foi possível carregar as demandas agora."
            : filtrouAlgo
              ? "Nenhuma demanda encontrada com esses filtros."
              : "Nenhuma demanda em andamento. Use os filtros acima para ver as finalizadas."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-nevoa-200 dark:border-nevoa-800">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left bg-nevoa-50 dark:bg-nevoa-900 border-b border-nevoa-200 dark:border-nevoa-800">
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Demanda / Periciando(a)
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Tipo de trabalho
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Área da demanda
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Etapa contratada
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Situação
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Valor
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Data
                  </th>
                  <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-nevoa-900/40">
                {processos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-nevoa-100 dark:border-nevoa-800 last:border-0 hover:bg-nevoa-50 dark:hover:bg-nevoa-800/60"
                  >
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/processos/${p.id}`}
                        className="font-medium text-petroleo-600 hover:underline dark:text-petroleo-400"
                      >
                        {p.numero_processo ||
                          p.periciando_nome ||
                          primeiroNomePoloAtivoPorProcesso.get(p.id) ||
                          p.parte_autora ||
                          "(sem identificação)"}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">
                      {TIPO_TRABALHO_ROTULOS[p.tipo_trabalho] ?? p.tipo_trabalho}
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">
                      {p.tipo_laudo_id ? (nomePorTipoLaudo.get(p.tipo_laudo_id) ?? "—") : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">
                      {p.etapas_contratadas && p.etapas_contratadas.length > 0
                        ? ETAPAS_CONTRATADAS_ORDENADAS.filter((e) => p.etapas_contratadas?.includes(e))
                            .map((e) => ETAPA_CONTRATADA_ROTULOS[e])
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      {p.situacao_processo ? (
                        <Selo variante={varianteSituacaoProcesso(p.situacao_processo)}>{p.situacao_processo}</Selo>
                      ) : (
                        <span className="text-nevoa-400 dark:text-nevoa-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300 tabular-nums">{moedaBRL(valorDoProcesso(p))}</td>
                    <td className="py-2.5 px-4 text-nevoa-500 dark:text-nevoa-400 tabular-nums whitespace-nowrap">{dataCurta(p.created_at)}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/processos/${p.id}`}
                          aria-label="Ver processo"
                          title="Ver"
                          className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 p-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/processos/${p.id}/editar`}
                          aria-label="Editar processo"
                          title="Editar"
                          className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 p-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <ExcluirProcessoButton
                          processoId={p.id}
                          temDocumentoProtocolado={
                            processosComDocumentoProtocolado === null || processosComDocumentoProtocolado.has(p.id)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-nevoa-500 dark:text-nevoa-400">
            <p>
              {totalFiltrado ?? 0} {totalFiltrado === 1 ? "demanda encontrada" : "demandas encontradas"}
            </p>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <Link
                  href={hrefPagina(Math.max(1, pagina - 1))}
                  aria-disabled={pagina === 1}
                  className={`rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 ${pagina === 1 ? "pointer-events-none opacity-40" : "hover:bg-nevoa-100 dark:hover:bg-nevoa-800"}`}
                >
                  ‹
                </Link>
                <span className="px-2 tabular-nums">
                  {pagina} / {totalPaginas}
                </span>
                <Link
                  href={hrefPagina(Math.min(totalPaginas, pagina + 1))}
                  aria-disabled={pagina === totalPaginas}
                  className={`rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 ${pagina === totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-nevoa-100 dark:hover:bg-nevoa-800"}`}
                >
                  ›
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
