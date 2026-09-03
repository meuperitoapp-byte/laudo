import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { PoloPartesPanel } from "@/features/processos/polo-partes-panel";

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

/** Etapas contratadas da Assistência Técnica — rótulo e sigla (a sigla prefixa o título do processo de AT). */
const ETAPA_CONTRATADA_ROTULOS: Record<string, string> = {
  analise_viabilidade: "Análise de viabilidade",
  estrategia_pericial: "Estratégia pericial",
  analise_contestacao: "Análise da contestação",
  dados_replica: "Dados para réplica",
  quesitos: "Quesitos",
  parecer_tecnico: "Parecer técnico",
  relatorio_tecnico: "Relatório técnico",
  atestados: "Atestados",
  declaracao: "Declaração",
  manifestacao_laudo_pericial: "Manifestação ao laudo pericial",
  quesitos_suplementares: "Quesitos suplementares",
  participacao_pericia: "Participação da perícia",
};
const ETAPA_CONTRATADA_SIGLAS: Record<string, string> = {
  analise_viabilidade: "AV",
  estrategia_pericial: "EP",
  analise_contestacao: "AC",
  dados_replica: "DR",
  quesitos: "Q",
  parecer_tecnico: "PT",
  relatorio_tecnico: "RT",
  atestados: "ATE",
  declaracao: "DECL",
  manifestacao_laudo_pericial: "ML",
  quesitos_suplementares: "QS",
  participacao_pericia: "PP",
};

const SIM_NAO_ROTULOS: Record<string, string> = { sim: "Sim", nao: "Não" };
const ACEITOU_NOMEACAO_ROTULOS: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  destituida: "Destituída do cargo",
};

function moedaBRL(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Campo({ rotulo, children, colSpan }: { rotulo: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-500">{rotulo}</dt>
      <dd className="mt-1 text-sm text-nevoa-900 dark:text-nevoa-100">{children}</dd>
    </div>
  );
}

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("*")
    .eq("id", id)
    .single();

  if (!processo) {
    notFound();
  }

  const { data: partesDb } = await supabase
    .from("processo_partes")
    .select("*")
    .eq("processo_id", id)
    .order("ordem", { ascending: true });
  const partes = partesDb ?? [];

  // Gate do Módulo Pós-Laudo: a aba só abre quando existe um laudo (tipo =
  // 'laudo') marcado como protocolado — ver marcarLaudoProtocolado / migration
  // 20260905120000.
  const { data: laudoProtocolado } = await supabase
    .from("laudos_gerados")
    .select("id")
    .eq("processo_id", id)
    .eq("tipo", "laudo")
    .eq("protocolado", true)
    .limit(1)
    .maybeSingle();
  const temLaudoProtocolado = Boolean(laudoProtocolado);
  const nomesPoloAtivo = partes.filter((p) => p.polo === "ativo").map((p) => p.nome);
  const nomesPoloPassivo = partes.filter((p) => p.polo === "passivo").map((p) => p.nome);

  let tipoLaudoNome: string | null = null;
  let primeiraSecaoId: string | null = null;
  if (processo.tipo_laudo_id) {
    const [{ data: tipoLaudo }, { data: primeiraSecao }] = await Promise.all([
      supabase.from("tipos_laudo").select("*").eq("id", processo.tipo_laudo_id).single(),
      supabase
        .from("secoes")
        .select("id")
        .eq("tipo_laudo_id", processo.tipo_laudo_id)
        .order("ordem")
        .limit(1)
        .maybeSingle(),
    ]);
    tipoLaudoNome = tipoLaudo?.nome ?? null;
    primeiraSecaoId = primeiraSecao?.id ?? null;
  }

  // Título: no judicial, o nº do processo (ou nome). Na AT ainda pode não haver
  // processo — usa a sigla da 1ª etapa contratada + nome do periciado
  // (ex.: "AV - João da Silva").
  const primeiraEtapa = processo.etapas_contratadas?.[0];
  const siglaEtapa = primeiraEtapa ? ETAPA_CONTRATADA_SIGLAS[primeiraEtapa] : null;
  const nomePericiado = processo.periciando_nome || nomesPoloAtivo[0] || processo.parte_autora;
  const titulo =
    processo.tipo_trabalho === "assistencia_tecnica"
      ? [siglaEtapa && nomePericiado ? `${siglaEtapa} -` : null, nomePericiado].filter(Boolean).join(" ") ||
        "Processo sem identificação"
      : processo.numero_processo || nomePericiado || "Processo sem identificação";

  return (
    <main className="p-8 space-y-6 max-w-2xl">
      <div>
        <Link
          href="/processos"
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar para processos
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">{titulo}</h1>
        </div>
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Tipo de trabalho">{TIPO_TRABALHO_ROTULOS[processo.tipo_trabalho] ?? processo.tipo_trabalho}</Campo>
          <Campo rotulo="Tipo de laudo">{tipoLaudoNome ?? "—"}</Campo>

          {processo.tipo_trabalho === "pericia_judicial" && (
            <>
              <Campo rotulo="Número do processo">{processo.numero_processo ?? "—"}</Campo>
              <Campo rotulo="Vara/Comarca">
                {[processo.vara_numero, processo.comarca_subsecao, processo.uf].filter(Boolean).join(" — ") || "—"}
              </Campo>
              <Campo rotulo="Polo Ativo">
                {nomesPoloAtivo.length > 0 ? nomesPoloAtivo.join(", ") : (processo.parte_autora ?? "—")}
              </Campo>
              <Campo rotulo="Polo Passivo">
                {nomesPoloPassivo.length > 0 ? nomesPoloPassivo.join(", ") : (processo.partes_re ?? "—")}
              </Campo>
              <Campo rotulo="Periciando(a)">{processo.periciando_nome ?? "—"}</Campo>
              <Campo rotulo="Objeto da perícia" colSpan>
                {processo.objeto_pericia ?? "—"}
              </Campo>
            </>
          )}

          {processo.tipo_trabalho === "assistencia_tecnica" && (
            <>
              <Campo rotulo="Contratante">{processo.cliente_parte_assistida ?? "—"}</Campo>
              <Campo rotulo="Advogado">{processo.advogado_escritorio ?? "—"}</Campo>
              <Campo rotulo="Periciado(a)">{processo.periciando_nome ?? "—"}</Campo>
              <Campo rotulo="Etapas contratadas" colSpan>
                {processo.etapas_contratadas && processo.etapas_contratadas.length > 0
                  ? processo.etapas_contratadas
                      .map((e) => ETAPA_CONTRATADA_ROTULOS[e] ?? e)
                      .join(", ")
                  : "—"}
              </Campo>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-4">
          Situação e financeiro
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Situação do processo">{processo.situacao_processo ?? "—"}</Campo>
          <Campo rotulo="Situação financeira">{processo.situacao_financeira ?? "—"}</Campo>
          <Campo rotulo="Ação / Objeto" colSpan>
            {processo.acao_objeto ?? "—"}
          </Campo>
          <Campo rotulo="Valor do processo">{moedaBRL(processo.valor_processo)}</Campo>
          <Campo rotulo="Justiça gratuita">
            {processo.justica_gratuita ? SIM_NAO_ROTULOS[processo.justica_gratuita] : "—"}
          </Campo>
          <Campo rotulo="Honorário apresentado">{moedaBRL(processo.honorario_apresentado)}</Campo>
          <Campo rotulo="Honorário arbitrado">{moedaBRL(processo.honorario_arbitrado)}</Campo>
          {processo.tipo_trabalho === "pericia_judicial" && (
            <Campo rotulo="Aceitou nomeação">
              {processo.aceitou_nomeacao ? ACEITOU_NOMEACAO_ROTULOS[processo.aceitou_nomeacao] : "—"}
            </Campo>
          )}
          <Campo rotulo="URL do processo">
            {processo.url_processo ? (
              <a
                href={processo.url_processo}
                target="_blank"
                rel="noreferrer"
                className="text-petroleo-600 hover:underline dark:text-petroleo-400 break-all"
              >
                {processo.url_processo}
              </a>
            ) : (
              "—"
            )}
          </Campo>
        </dl>
      </div>

      {processo.tipo_trabalho === "pericia_judicial" && (
        <PoloPartesPanel processoId={processo.id} partes={partes} />
      )}

      <div className="flex flex-wrap gap-3">
        {primeiraSecaoId ? (
          <Link
            href={`/processos/${processo.id}/preenchimento/${primeiraSecaoId}`}
            className={classesBotao("primaria")}
          >
            Preencher laudo
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-md border border-nevoa-200 dark:border-nevoa-800 px-4 py-2 text-sm text-nevoa-400 dark:text-nevoa-600">
            Preencher laudo (defina o tipo de laudo)
          </span>
        )}
        <Link href={`/processos/${processo.id}/editar`} className={classesBotao("secundaria")}>
          Editar dados do processo
        </Link>
        <Link href={`/processos/${processo.id}/quesitos`} className={classesBotao("secundaria")}>
          Quesitos
        </Link>
        <Link href={`/processos/${processo.id}/documentos`} className={classesBotao("secundaria")}>
          Documentos
        </Link>
        <Link href={`/processos/${processo.id}/laudo`} className={classesBotao("secundaria")}>
          Laudo final
        </Link>
        {temLaudoProtocolado ? (
          <Link href={`/processos/${processo.id}/pos-laudo`} className={classesBotao("secundaria")}>
            Pós-laudo
          </Link>
        ) : (
          <span
            className="inline-flex items-center rounded-md border border-nevoa-200 dark:border-nevoa-800 px-4 py-2 text-sm text-nevoa-400 dark:text-nevoa-600"
            title="Disponível após marcar o laudo como protocolado, na tela Laudo final."
          >
            Pós-laudo (marque o laudo como protocolado)
          </span>
        )}
      </div>
    </main>
  );
}
