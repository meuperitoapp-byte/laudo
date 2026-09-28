import Link from "next/link";
import { Scale, HeartPulse, Stethoscope, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { KpiTendenciaCard } from "@/components/ui/kpi-tendencia-card";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { RelacionamentoFiltros } from "@/features/relacionamento/relacionamento-filtros";
import {
  TIPO_ROTULOS,
  FAIXA_ROTULOS,
  FAIXA_SELO_VARIANTE,
  CATEGORIA_ROTULOS,
  ORIGEM_ROTULOS,
} from "@/features/relacionamento/catalogos";
import { faixaContato, categoriaPorReceita, ultimoContato, calcularHistoricoFinanceiro, type ProcessoVinculado } from "@/features/relacionamento/ranking";
import { montarCalendarioInteligente } from "@/features/relacionamento/calendario";
import { montarCampanhasAutomaticas } from "@/features/relacionamento/campanhas";
import { montarResumoIndicacoes, montarResumoConexoes } from "@/features/relacionamento/indicacoes-conexoes";
import { calcularFunilClienteSaudePorOrigem } from "@/features/relacionamento/funil-cliente-saude";
import { hojeIsoBrasil, nivelPorPrazo } from "@/features/central-prazos/regras";
import { NIVEL_SELO_VARIANTE, NIVEL_ROTULOS } from "@/features/central-prazos/rotulos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import type { RelacionamentoTipo, RelacionamentoOrigem, RelacionamentoFaixaContato } from "@/types/enums";

function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function moedaBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RelacionamentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filtroTipo = param(sp.tipo) as RelacionamentoTipo | "";
  const filtroOrigem = param(sp.origem) as RelacionamentoOrigem | "";
  const filtroMeuPerito = param(sp.meu_perito);
  const filtroFaixa = param(sp.faixa) as RelacionamentoFaixaContato | "";

  const supabase = await createClient();
  const [
    { data: relacionamentosDb, error: erroRelacionamentos },
    { data: interacoesDb, error: erroInteracoes },
    { data: processosDb, error: erroProcessos },
    { data: continuidadeDb, error: erroContinuidade },
    { data: processosIdentificacaoDb },
    { data: advogadosDb, error: erroAdvogados },
    { data: premiacoesDb, error: erroPremiacoes },
    { data: campanhasSaudeDb, error: erroCampanhasSaude },
    { data: datasComemorativasDb, error: erroDatasComemorativas },
    { data: configDb },
    { data: creditosDb, error: erroCreditos },
    { data: encaminhamentosGlobaisDb, error: erroEncaminhamentos },
  ] = await Promise.all([
    supabase.from("relacionamentos").select("*").order("nome", { ascending: true }),
    supabase.from("relacionamento_interacoes").select("relacionamento_id, data"),
    supabase
      .from("processos")
      .select("id, relacionamento_id, tipo_trabalho, status, honorario_arbitrado, honorario_apresentado, valor_processo, honorarios_recebidos_em, data_pagamento_at, etapas_contratadas, created_at")
      .not("relacionamento_id", "is", null),
    supabase
      .from("continuidade_oportunidades")
      .select("id, processo_id, relacionamento_id, servico_origem, data_limite")
      .eq("status", "aberta")
      .order("data_limite", { ascending: true }),
    supabase.from("processos").select("id, numero_processo, periciando_nome, parte_autora"),
    supabase.from("relacionamento_advogados").select("*"),
    supabase.from("relacionamento_premiacoes").select("*"),
    supabase.from("campanhas_tematicas_saude").select("*").eq("ativo", true),
    supabase.from("datas_comemorativas_profissionais").select("*").eq("ativo", true),
    supabase.from("relacionamento_configuracoes").select("*").eq("id", true).maybeSingle(),
    supabase.from("relacionamento_creditos_indicacao").select("*"),
    supabase.from("relacionamento_encaminhamentos").select("*"),
  ]);

  for (const [rotulo, erro] of [
    ["cadastros", erroRelacionamentos],
    ["contatos", erroInteracoes],
    ["processos vinculados", erroProcessos],
    ["continuidade de serviços", erroContinuidade],
    ["advogados vinculados", erroAdvogados],
    ["premiações", erroPremiacoes],
    ["campanhas de saúde", erroCampanhasSaude],
    ["datas comemorativas", erroDatasComemorativas],
    ["créditos de indicação", erroCreditos],
    ["encaminhamentos", erroEncaminhamentos],
  ] as const) {
    if (erro) console.error(`Relacionamento: falha ao buscar ${rotulo}:`, erro.message);
  }

  const relacionamentos = relacionamentosDb ?? [];
  const hoje = hojeIsoBrasil();

  const interacoesPorRelacionamento = new Map<string, { data: string }[]>();
  for (const i of interacoesDb ?? []) {
    const lista = interacoesPorRelacionamento.get(i.relacionamento_id) ?? [];
    lista.push({ data: i.data });
    interacoesPorRelacionamento.set(i.relacionamento_id, lista);
  }
  const processosPorRelacionamento = new Map<string, ProcessoVinculado[]>();
  for (const p of processosDb ?? []) {
    if (!p.relacionamento_id) continue;
    const lista = processosPorRelacionamento.get(p.relacionamento_id) ?? [];
    lista.push(p);
    processosPorRelacionamento.set(p.relacionamento_id, lista);
  }

  const comCalculo = relacionamentos.map((r) => {
    const interacoes = interacoesPorRelacionamento.get(r.id) ?? [];
    const ultimaData = ultimoContato(interacoes);
    const diasSemContato = ultimaData
      ? Math.floor((new Date(hoje + "T00:00:00Z").getTime() - new Date(ultimaData + "T00:00:00Z").getTime()) / 86400000)
      : Math.floor((new Date(hoje + "T00:00:00Z").getTime() - new Date(r.created_at.slice(0, 10) + "T00:00:00Z").getTime()) / 86400000);
    const faixa = faixaContato(diasSemContato);
    const processos = processosPorRelacionamento.get(r.id) ?? [];
    const categoria = r.tipo === "advogado_escritorio" ? categoriaPorReceita(calcularHistoricoFinanceiro(processos, hoje).receitaTotal) : null;
    return { r, faixa, categoria, diasSemContato };
  });

  const filtrados = comCalculo.filter(({ r, faixa }) => {
    if (filtroTipo && r.tipo !== filtroTipo) return false;
    if (filtroOrigem && r.origem !== filtroOrigem) return false;
    if (filtroMeuPerito === "sim" && !r.meu_perito) return false;
    if (filtroMeuPerito === "nao" && r.meu_perito) return false;
    if (filtroFaixa && faixa !== filtroFaixa) return false;
    return true;
  });

  const prioridades = comCalculo
    .filter(({ faixa, categoria }) => (faixa === "laranja" || faixa === "vermelho") && (categoria === "diamante" || categoria === "ouro"))
    .sort((a, b) => b.diasSemContato - a.diasSemContato)
    .slice(0, 8);

  const totalAdvogados = relacionamentos.filter((r) => r.tipo === "advogado_escritorio").length;
  const totalClientesSaude = relacionamentos.filter((r) => r.tipo === "cliente_saude").length;
  const totalProfissionais = relacionamentos.filter((r) => r.tipo === "profissional").length;
  const meuPeritoAssinantes = relacionamentos.filter((r) => r.meu_perito && r.meu_perito_status === "assinante").length;

  const processoIdentificacaoPorId = new Map((processosIdentificacaoDb ?? []).map((p) => [p.id, p]));
  const relacionamentoNomePorId = new Map(relacionamentos.map((r) => [r.id, r.nome]));

  const calendario = montarCalendarioInteligente({
    hojeIso: hoje,
    janelaDias: configDb?.dias_antecedencia_aniversarios ?? 15,
    relacionamentos,
    advogados: advogadosDb ?? [],
    premiacoes: premiacoesDb ?? [],
    campanhasSaude: campanhasSaudeDb ?? [],
    datasComemorativas: datasComemorativasDb ?? [],
  });

  const campanhas = montarCampanhasAutomaticas(comCalculo, processosPorRelacionamento, hoje);
  const idsComProcessoVinculado = new Set(processosPorRelacionamento.keys());
  const resumoIndicacoes = montarResumoIndicacoes(relacionamentos, creditosDb ?? [], idsComProcessoVinculado);
  const resumoConexoes = montarResumoConexoes(encaminhamentosGlobaisDb ?? [], relacionamentos);
  const funilClienteSaude = calcularFunilClienteSaudePorOrigem(relacionamentos.filter((r) => r.tipo === "cliente_saude"), idsComProcessoVinculado);

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Relacionamento</h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
            Advogados/escritórios, Clientes Saúde e Profissionais — o lado comercial da PERICONS.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/relacionamento/configuracoes" className={classesBotao("secundaria")}>Configurações</Link>
          <Link href="/relacionamento/novo" className={classesBotao("primaria")}>+ Novo cadastro</Link>
        </div>
      </div>

      {(erroRelacionamentos || erroInteracoes || erroProcessos || erroContinuidade) && (
        <BannerErroConsulta mensagem="Não consegui carregar todos os dados de Relacionamento agora — os números abaixo podem estar incompletos." />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTendenciaCard rotulo="Advogados/Escritórios" valor={totalAdvogados} icone={<Scale className="h-5 w-5" />} />
        <KpiTendenciaCard rotulo="Clientes Saúde" valor={totalClientesSaude} icone={<HeartPulse className="h-5 w-5" />} />
        <KpiTendenciaCard rotulo="Profissionais" valor={totalProfissionais} icone={<Stethoscope className="h-5 w-5" />} />
        <KpiTendenciaCard rotulo="MEU PERITO — assinantes" valor={meuPeritoAssinantes} icone={<Star className="h-5 w-5" />} />
      </div>

      {prioridades.length > 0 && (
        <DashboardCard titulo="Prioridades de relacionamento" subtitulo="Categoria alta (Diamante/Ouro) esfriando ou pedindo reativação">
          <ul className="space-y-2">
            {prioridades.map(({ r, faixa, categoria, diasSemContato }) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <Link href={`/relacionamento/${r.id}`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                  {categoria && CATEGORIA_ROTULOS[categoria]} — {r.nome}
                </Link>
                <span className="flex items-center gap-2 text-nevoa-500 dark:text-nevoa-400">
                  {diasSemContato}d sem contato
                  <Selo variante={FAIXA_SELO_VARIANTE[faixa]}>{FAIXA_ROTULOS[faixa]}</Selo>
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      {(continuidadeDb ?? []).length > 0 && (
        <DashboardCard titulo="Fila de continuidade de serviços" subtitulo="Oportunidades em aberto — follow-up pendente">
          <ul className="space-y-2">
            {(continuidadeDb ?? []).map((o) => {
              const processo = processoIdentificacaoPorId.get(o.processo_id);
              const nivel = nivelPorPrazo(o.data_limite, hoje);
              return (
                <li key={o.id} className="flex items-center justify-between text-sm">
                  <Link href={`/processos/${o.processo_id}/continuidade`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                    {o.servico_origem} — {o.relacionamento_id ? relacionamentoNomePorId.get(o.relacionamento_id) : (processo?.numero_processo || processo?.periciando_nome || "Processo")}
                  </Link>
                  <span className="flex items-center gap-2 text-nevoa-500 dark:text-nevoa-400">
                    até {dataCurta(o.data_limite)}
                    <Selo variante={NIVEL_SELO_VARIANTE[nivel] ?? "neutro"}>{NIVEL_ROTULOS[nivel]}</Selo>
                  </span>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      )}

      {calendario.length > 0 && (
        <DashboardCard titulo="Próximas oportunidades de relacionamento" subtitulo="Aniversários, datas profissionais, marcos de parceria, campanhas de saúde, premiações e MEU PERITO">
          <ul className="space-y-2">
            {calendario.slice(0, 12).map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <Link href={o.href} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                  {o.titulo}
                </Link>
                <span className="flex items-center gap-2 text-nevoa-500 dark:text-nevoa-400">
                  {o.subtitulo && <span className="text-xs">{o.subtitulo}</span>}
                  {o.diasRestantes === 0 ? "hoje" : o.diasRestantes > 0 ? `em ${o.diasRestantes}d` : dataCurta(o.data)}
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      <DashboardCard titulo="Campanhas" subtitulo="§7.2 — público sempre calculado, nunca digitado">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Presentes de fim de ano ({campanhas.fimDeAno.length})</p>
            <ul className="space-y-1">
              {campanhas.fimDeAno.slice(0, 5).map((i) => (
                <li key={i.id}><Link href={`/relacionamento/${i.id}`} className="text-sm text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.nome}</Link> <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{i.detalhe}</span></li>
              ))}
              {campanhas.fimDeAno.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Nenhum elegível.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
              Top Parceiros — {campanhas.topParceirosSemestre.semestre}º sem. {campanhas.topParceirosSemestre.ano}
            </p>
            <ul className="space-y-1">
              {campanhas.topParceirosSemestre.itens.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <Link href={`/relacionamento/${i.id}`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.posicao}º {i.nome}</Link>
                  <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{moedaBRL(i.receitaSemestre)}</span>
                </li>
              ))}
              {campanhas.topParceirosSemestre.itens.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Sem faturamento no semestre.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">MEU PERITO — potencial ({campanhas.meuPeritoPotencial.length})</p>
            <ul className="space-y-1">
              {campanhas.meuPeritoPotencial.slice(0, 5).map((i) => (
                <li key={i.id}><Link href={`/relacionamento/${i.id}`} className="text-sm text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.nome}</Link> {i.detalhe && <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{i.detalhe}</span>}</li>
              ))}
              {campanhas.meuPeritoPotencial.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Nenhum pendente.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Atenção — 31-60d ({campanhas.atencao.length})</p>
            <ul className="space-y-1">{campanhas.atencao.slice(0, 5).map((i) => <li key={i.id}><Link href={`/relacionamento/${i.id}`} className="text-sm text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.nome}</Link></li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Esfriando — 61-90d ({campanhas.esfriando.length})</p>
            <ul className="space-y-1">{campanhas.esfriando.slice(0, 5).map((i) => <li key={i.id}><Link href={`/relacionamento/${i.id}`} className="text-sm text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.nome}</Link></li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Reativação — +90d ({campanhas.reativacao.length})</p>
            <ul className="space-y-1">{campanhas.reativacao.slice(0, 5).map((i) => <li key={i.id}><Link href={`/relacionamento/${i.id}`} className="text-sm text-petroleo-600 dark:text-petroleo-400 hover:underline">{i.nome}</Link></li>)}</ul>
          </div>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard titulo="Indicações" subtitulo="Novas indicações, conversão e créditos">
          <p className="text-sm text-nevoa-700 dark:text-nevoa-300 mb-2">
            {resumoIndicacoes.totalConvertidos} convertida(s) de {relacionamentos.filter((r) => r.origem === "indicacao").length} indicação(ões) · Saldo total de créditos: <strong>{moedaBRL(resumoIndicacoes.saldoTotalCreditos)}</strong>
          </p>
          <ul className="space-y-1.5">
            {resumoIndicacoes.novasIndicacoes.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <Link href={`/relacionamento/${i.id}`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                  {i.indicadoNome}{i.indicadorNome ? ` (por ${i.indicadorNome})` : ""}
                </Link>
                {i.convertido ? <Selo variante="sucesso">Convertido</Selo> : <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{dataCurta(i.createdAt)}</span>}
              </li>
            ))}
            {resumoIndicacoes.novasIndicacoes.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Nenhuma indicação registrada ainda.</li>}
          </ul>
        </DashboardCard>

        <DashboardCard titulo="Conexões" subtitulo="Encaminhamentos aguardando escritório ou em acompanhamento">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Aguardando escritório ({resumoConexoes.aguardandoEscritorio.length})</p>
              <ul className="space-y-1">
                {resumoConexoes.aguardandoEscritorio.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-nevoa-700 dark:text-nevoa-300">{c.origemNome} → {c.destinoNome ?? "—"}</span>
                    <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{dataCurta(c.data)}</span>
                  </li>
                ))}
                {resumoConexoes.aguardandoEscritorio.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Nenhuma.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">Em acompanhamento ({resumoConexoes.emAcompanhamento.length})</p>
              <ul className="space-y-1">
                {resumoConexoes.emAcompanhamento.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-nevoa-700 dark:text-nevoa-300">{c.origemNome} → {c.destinoNome ?? "—"}</span>
                    <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{dataCurta(c.data)}</span>
                  </li>
                ))}
                {resumoConexoes.emAcompanhamento.length === 0 && <li className="text-sm text-nevoa-400 dark:text-nevoa-600">Nenhuma.</li>}
              </ul>
            </div>
          </div>
        </DashboardCard>
      </div>

      {funilClienteSaude.length > 0 && (
        <DashboardCard titulo="Cliente Saúde — efetividade por origem" subtitulo="§11.2 — contatos gerados, triagens, demandas qualificadas, encaminhamentos e contratações">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-nevoa-500 dark:text-nevoa-400 border-b border-nevoa-200 dark:border-nevoa-800">
                  <th className="py-2 pr-4 font-medium">Origem</th>
                  <th className="py-2 pr-4 font-medium">Contatos gerados</th>
                  <th className="py-2 pr-4 font-medium">Triagens</th>
                  <th className="py-2 pr-4 font-medium">Demandas qualificadas</th>
                  <th className="py-2 pr-4 font-medium">Encaminhamentos</th>
                  <th className="py-2 font-medium">Contratações</th>
                </tr>
              </thead>
              <tbody>
                {funilClienteSaude.map((f) => (
                  <tr key={f.origem} className="border-b border-nevoa-100 dark:border-nevoa-900 last:border-0">
                    <td className="py-2 pr-4 text-nevoa-800 dark:text-nevoa-200">{ORIGEM_ROTULOS[f.origem]}</td>
                    <td className="py-2 pr-4 tabular-nums">{f.contatosGerados}</td>
                    <td className="py-2 pr-4 tabular-nums">{f.triagens}</td>
                    <td className="py-2 pr-4 tabular-nums">{f.demandasQualificadas}</td>
                    <td className="py-2 pr-4 tabular-nums">{f.encaminhamentos}</td>
                    <td className="py-2 tabular-nums">{f.contratacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      <RelacionamentoFiltros />

      <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-nevoa-500 dark:text-nevoa-400 border-b border-nevoa-200 dark:border-nevoa-800">
              <th className="py-2.5 px-4 font-medium">Nome</th>
              <th className="py-2.5 px-4 font-medium">Tipo</th>
              <th className="py-2.5 px-4 font-medium">Categoria</th>
              <th className="py-2.5 px-4 font-medium">Faixa</th>
              <th className="py-2.5 px-4 font-medium">MEU PERITO</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-nevoa-500 dark:text-nevoa-400">Nenhum cadastro encontrado.</td>
              </tr>
            ) : (
              filtrados.map(({ r, faixa, categoria }) => (
                <tr key={r.id} className="border-b border-nevoa-100 dark:border-nevoa-900 last:border-0 hover:bg-nevoa-25 dark:hover:bg-nevoa-950/40">
                  <td className="py-2.5 px-4">
                    <Link href={`/relacionamento/${r.id}`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline font-medium">{r.nome}</Link>
                  </td>
                  <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">{TIPO_ROTULOS[r.tipo]}</td>
                  <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">{categoria ? CATEGORIA_ROTULOS[categoria] : "—"}</td>
                  <td className="py-2.5 px-4"><Selo variante={FAIXA_SELO_VARIANTE[faixa]}>{FAIXA_ROTULOS[faixa]}</Selo></td>
                  <td className="py-2.5 px-4">{r.meu_perito ? <Selo variante="sucesso">Sim</Selo> : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
