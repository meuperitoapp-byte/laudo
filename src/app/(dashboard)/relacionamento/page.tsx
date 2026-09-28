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
} from "@/features/relacionamento/catalogos";
import { faixaContato, categoriaPorReceita, ultimoContato, calcularHistoricoFinanceiro, type ProcessoVinculado } from "@/features/relacionamento/ranking";
import { montarCalendarioInteligente } from "@/features/relacionamento/calendario";
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
