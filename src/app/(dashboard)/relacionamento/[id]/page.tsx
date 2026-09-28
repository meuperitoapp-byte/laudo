import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { ExcluirRelacionamentoButton } from "@/features/relacionamento/excluir-relacionamento-button";
import { ProximaAcaoPanel } from "@/features/relacionamento/proxima-acao-panel";
import { InteracoesPanel } from "@/features/relacionamento/interacoes-panel";
import { AdvogadosPanel } from "@/features/relacionamento/advogados-panel";
import { PremiacoesPanel } from "@/features/relacionamento/premiacoes-panel";
import { IndicacaoPanel } from "@/features/relacionamento/indicacao-panel";
import { EncaminhamentosPanel } from "@/features/relacionamento/encaminhamentos-panel";
import {
  TIPO_ROTULOS,
  ORIGEM_ROTULOS,
  FAIXA_ROTULOS,
  FAIXA_SELO_VARIANTE,
  CATEGORIA_ROTULOS,
  MEU_PERITO_STATUS_ROTULOS,
  CS_STATUS_ROTULOS,
  PROF_PROFISSAO_ROTULOS,
} from "@/features/relacionamento/catalogos";
import { faixaContato, categoriaPorReceita, ultimoContato, calcularHistoricoComercial, calcularHistoricoFinanceiro } from "@/features/relacionamento/ranking";
import { hojeIsoBrasil } from "@/features/central-prazos/regras";
import { listarNomesResponsaveis } from "@/lib/supabase/responsaveis";
import { valorDoProcesso } from "@/features/processos/valor";
import { ErroConsultaPagina } from "@/components/ui/erro-consulta";

function moedaBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default async function FichaRelacionamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacionamento, error: erroRelacionamento } = await supabase
    .from("relacionamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (erroRelacionamento) {
    console.error(`Ficha de relacionamento ${id}: falha ao buscar cadastro:`, erroRelacionamento.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar este cadastro agora" />;
  }
  if (!relacionamento) notFound();

  const [
    { data: interacoesDb },
    { data: advogadosDb },
    { data: premiacoesDb },
    { data: creditosDb },
    { data: encaminhamentosDb },
    { data: escritoriosDb },
    { data: processosDb },
    { data: configDb },
    indicadorNome,
    nomesResponsaveis,
  ] = await Promise.all([
    supabase.from("relacionamento_interacoes").select("*").eq("relacionamento_id", id),
    supabase.from("relacionamento_advogados").select("*").eq("relacionamento_id", id).order("nome"),
    supabase.from("relacionamento_premiacoes").select("*").eq("relacionamento_id", id).order("created_at", { ascending: false }),
    supabase.from("relacionamento_creditos_indicacao").select("*").eq("indicador_id", id),
    supabase.from("relacionamento_encaminhamentos").select("*").eq("origem_id", id).order("data", { ascending: false }),
    supabase.from("relacionamentos").select("id, nome").eq("tipo", "advogado_escritorio").neq("id", id).order("nome"),
    supabase
      .from("processos")
      .select("id, numero_processo, periciando_nome, parte_autora, tipo_trabalho, status, honorario_arbitrado, honorario_apresentado, valor_processo, honorarios_recebidos_em, data_pagamento_at, etapas_contratadas, created_at")
      .eq("relacionamento_id", id),
    supabase.from("relacionamento_configuracoes").select("*").eq("id", true).maybeSingle(),
    relacionamento.indicado_por_id
      ? supabase.from("relacionamentos").select("nome").eq("id", relacionamento.indicado_por_id).maybeSingle().then((r) => r.data?.nome ?? null)
      : Promise.resolve(null),
    listarNomesResponsaveis(),
  ]);

  const interacoes = interacoesDb ?? [];
  const processos = processosDb ?? [];
  const hoje = hojeIsoBrasil();
  const ultimaData = ultimoContato(interacoes);
  const diasSemContato = ultimaData
    ? Math.floor((new Date(hoje + "T00:00:00Z").getTime() - new Date(ultimaData + "T00:00:00Z").getTime()) / 86400000)
    : Math.floor((new Date(hoje + "T00:00:00Z").getTime() - new Date(relacionamento.created_at.slice(0, 10) + "T00:00:00Z").getTime()) / 86400000);
  const faixa = faixaContato(diasSemContato);

  const historicoComercial = calcularHistoricoComercial(processos);
  const historicoFinanceiro = calcularHistoricoFinanceiro(processos, hoje);
  const categoria = relacionamento.tipo === "advogado_escritorio" ? categoriaPorReceita(historicoFinanceiro.receitaTotal) : null;

  const encaminhamentos = (encaminhamentosDb ?? []).map((e) => ({
    ...e,
    destino_nome: null as string | null,
  }));
  if (encaminhamentos.some((e) => e.destino_id)) {
    const idsDestino = [...new Set(encaminhamentos.map((e) => e.destino_id).filter((v): v is string => Boolean(v)))];
    const { data: destinosDb } = await supabase.from("relacionamentos").select("id, nome").in("id", idsDestino);
    const nomePorId = new Map((destinosDb ?? []).map((d) => [d.id, d.nome]));
    for (const e of encaminhamentos) {
      if (e.destino_id) e.destino_nome = nomePorId.get(e.destino_id) ?? null;
    }
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/relacionamento" className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
            ← Voltar
          </Link>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">{relacionamento.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Selo variante="neutro">{TIPO_ROTULOS[relacionamento.tipo]}</Selo>
            <Selo variante={FAIXA_SELO_VARIANTE[faixa]}>{FAIXA_ROTULOS[faixa]}</Selo>
            {categoria && categoria !== "sem_categoria" && <Selo variante="neutro">{CATEGORIA_ROTULOS[categoria]}</Selo>}
            {relacionamento.meu_perito && <Selo variante="sucesso">MEU PERITO{relacionamento.meu_perito_status ? ` — ${MEU_PERITO_STATUS_ROTULOS[relacionamento.meu_perito_status]}` : ""}</Selo>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/relacionamento/${id}/editar`} className={classesBotao("secundaria")}>Editar</Link>
          <ExcluirRelacionamentoButton id={id} nome={relacionamento.nome} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Origem</p>
          <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100">{ORIGEM_ROTULOS[relacionamento.origem]}</p>
          {indicadorNome && <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">Indicado por {indicadorNome}</p>}
        </div>
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Último contato</p>
          <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100">{ultimaData ? `${dataCurta(ultimaData)} (${diasSemContato}d)` : "Nenhum registrado"}</p>
        </div>
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Casos enviados</p>
          <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100">{historicoComercial.casosEnviados}</p>
        </div>
      </div>

      {relacionamento.tipo === "advogado_escritorio" && (
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
          <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Histórico comercial e financeiro</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Receita total</p>
              <p className="font-medium text-nevoa-900 dark:text-nevoa-100">{moedaBRL(historicoFinanceiro.receitaTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Últimos 12 meses</p>
              <p className="font-medium text-nevoa-900 dark:text-nevoa-100">{moedaBRL(historicoFinanceiro.receitaUltimos12Meses)}</p>
            </div>
            <div>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Ticket médio</p>
              <p className="font-medium text-nevoa-900 dark:text-nevoa-100">{moedaBRL(historicoFinanceiro.ticketMedio)}</p>
            </div>
            <div>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Em aberto</p>
              <p className="font-medium text-nevoa-900 dark:text-nevoa-100">{moedaBRL(historicoFinanceiro.valoresEmAberto)}</p>
            </div>
          </div>
          {historicoComercial.servicoMaisContratado && (
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Serviço mais contratado: {historicoComercial.servicoMaisContratado}</p>
          )}
        </div>
      )}

      {relacionamento.tipo === "cliente_saude" && (
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6">
          <p className="text-sm text-nevoa-700 dark:text-nevoa-300">Jornada: <span className="font-medium">{CS_STATUS_ROTULOS[relacionamento.cs_status ?? "entrada"]}</span></p>
        </div>
      )}
      {relacionamento.tipo === "profissional" && relacionamento.prof_profissao && (
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6">
          <p className="text-sm text-nevoa-700 dark:text-nevoa-300">{PROF_PROFISSAO_ROTULOS[relacionamento.prof_profissao]}{relacionamento.prof_especialidade ? ` — ${relacionamento.prof_especialidade}` : ""}</p>
        </div>
      )}

      {processos.length > 0 && (
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-2">
          <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Processos vinculados</h2>
          <ul className="space-y-1.5">
            {processos.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/processos/${p.id}`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                  {p.numero_processo || p.periciando_nome || p.parte_autora || "Processo sem identificação"}
                </Link>
                <span className="text-nevoa-500 dark:text-nevoa-400">{moedaBRL(valorDoProcesso(p) ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProximaAcaoPanel relacionamento={relacionamento} />
      <InteracoesPanel relacionamentoId={id} interacoes={interacoes} nomesResponsaveis={nomesResponsaveis} />
      {relacionamento.tipo === "advogado_escritorio" && (
        <AdvogadosPanel relacionamentoId={id} advogados={advogadosDb ?? []} />
      )}
      <PremiacoesPanel relacionamentoId={id} premiacoes={premiacoesDb ?? []} />
      {relacionamento.tipo === "advogado_escritorio" && (
        <IndicacaoPanel indicadorId={id} creditos={creditosDb ?? []} valorPadrao={configDb?.valor_credito_indicacao_padrao ?? 0} />
      )}
      {(relacionamento.tipo === "cliente_saude" || relacionamento.tipo === "profissional") && (
        <EncaminhamentosPanel origemId={id} encaminhamentos={encaminhamentos} escritorios={escritoriosDb ?? []} />
      )}
    </main>
  );
}
