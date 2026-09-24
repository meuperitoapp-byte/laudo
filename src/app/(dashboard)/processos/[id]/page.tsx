import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { PoloPartesPanel } from "@/features/processos/polo-partes-panel";
import { ExcluirProcessoButton } from "@/features/processos/excluir-processo-button";
import { DocumentosPendentesPanel } from "@/features/processos/documentos-pendentes-panel";
import { ProximoMarcoHonorariosPanel } from "@/features/processos/proximo-marco-honorarios-panel";
import { ReuniaoEstrategiaPericialPanel } from "@/features/processos/reuniao-estrategia-pericial-panel";
import { NotaFiscalPanel } from "@/features/processos/nota-fiscal-panel";
import { AnexoEtapaAtPanel } from "@/features/processos/anexo-etapa-at-panel";
import {
  varianteSituacaoProcesso,
  ETAPA_CONTRATADA_ROTULOS,
  ETAPAS_CONTRATADAS_ORDENADAS,
  ETAPA_CONTRATADA_SIGLAS,
} from "@/features/processos/catalogos";
import { VIABILIDADE_STATUS_ROTULOS } from "@/features/viabilidade/catalogos";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60;

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const SIM_NAO_ROTULOS: Record<string, string> = { sim: "Sim", nao: "Não" };
const ACEITOU_NOMEACAO_ROTULOS: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  destituida: "Destituída do cargo",
  encargo_declinado: "Encargo declinado (devolvido após aceitar)",
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

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("*")
    .eq("id", id)
    .single();

  // PGRST116 = ".single()" não achou nenhuma linha — esse é o único caso que
  // significa "de verdade não existe". Qualquer OUTRO erro (rede, RLS,
  // instabilidade) é falha de leitura, não ausência do registro, e nunca
  // pode cair no mesmo caminho de notFound() — pra ela, um 404 aqui significa
  // "o caso sumiu", que é uma leitura muito mais grave (e errada) do que
  // "tenta de novo". Ver auditoria de 21/09/2026.
  if (erroProcesso && erroProcesso.code !== "PGRST116") {
    console.error(`Processo ${id}: falha ao buscar o registro principal:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar este processo agora" />;
  }
  if (!processo) {
    notFound();
  }

  const erros: string[] = [];

  // Fluxo AT: a aba Pós-laudo é a própria análise do laudo do perito JUDICIAL
  // (externo) — não depende de a perita ter gerado e protocolado um laudo aqui.
  const ehAssistenciaTecnica = processo.tipo_trabalho === "assistencia_tecnica";
  // Painéis de ação por etapa da AT (item 2 do lote pós-Fase-2, 21/09/2026)
  // — só aparecem quando a etapa correspondente foi contratada.
  const temEstrategiaPericial = ehAssistenciaTecnica && (processo.etapas_contratadas?.includes("estrategia_pericial") ?? false);
  const temAnaliseContestacao = ehAssistenciaTecnica && (processo.etapas_contratadas?.includes("analise_contestacao") ?? false);
  const temAnaliseViabilidade = ehAssistenciaTecnica && (processo.etapas_contratadas?.includes("analise_viabilidade") ?? false);

  // As 5 consultas abaixo só dependem do `id` do processo (já em mãos) ou de
  // flags já calculadas acima — nenhuma depende do RESULTADO de outra, então
  // disparam juntas em vez de uma atrás da outra (eram até 6 idas e voltas
  // sequenciais antes; corrigido em 22/09/2026, relato de lentidão ao trocar
  // de módulo). `tipoLaudo`/`primeiraSecao` e `anexosDb` só entram quando se
  // aplicam, senão viram uma promessa já resolvida com `data: null`.
  const [
    { data: partesDb, error: erroPartes },
    { data: laudoProtocolado, error: erroLaudoProtocolado },
    { count: totalProtocolados, error: erroTotalProtocolados },
    tipoLaudoResultado,
    primeiraSecaoResultado,
    { data: anexosDb, error: erroAnexos },
    { data: viabilidadeStatusDb, error: erroViabilidadeStatus },
  ] = await Promise.all([
    supabase.from("processo_partes").select("*").eq("processo_id", id).order("ordem", { ascending: true }),
    // Gate do Módulo Pós-Laudo: a aba só abre quando existe um laudo (tipo =
    // 'laudo') marcado como protocolado — ver marcarLaudoProtocolado / migration 20260905120000.
    supabase
      .from("laudos_gerados")
      .select("id")
      .eq("processo_id", id)
      .eq("tipo", "laudo")
      .eq("protocolado", true)
      .limit(1)
      .maybeSingle(),
    // Gate da exclusão: qualquer documento protocolado (não só o laudo
    // principal — inclui saídas de pós-laudo e do Fluxo Principal) bloqueia a
    // exclusão do processo, de propósito (documento protocolado é registro
    // oficial já entregue nos autos). Ver excluirProcesso, mesmo critério.
    supabase.from("laudos_gerados").select("id", { count: "exact", head: true }).eq("processo_id", id).eq("protocolado", true),
    processo.tipo_laudo_id
      ? supabase.from("tipos_laudo").select("*").eq("id", processo.tipo_laudo_id).single()
      : Promise.resolve({ data: null, error: null }),
    processo.tipo_laudo_id
      ? supabase
          .from("secoes")
          .select("id")
          .eq("tipo_laudo_id", processo.tipo_laudo_id)
          .order("ordem")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    temAnaliseContestacao
      ? supabase
          .from("documentos")
          .select("id, nome_arquivo, storage_path")
          .eq("processo_id", id)
          .eq("etapa_at", "analise_contestacao")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
    temAnaliseViabilidade
      ? supabase.from("analises_viabilidade").select("status").eq("processo_id", id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const { data: tipoLaudo, error: erroTipoLaudo } = tipoLaudoResultado;
  const { data: primeiraSecao, error: erroPrimeiraSecao } = primeiraSecaoResultado;

  if (erroPartes) {
    console.error(`Processo ${id}: falha ao buscar partes:`, erroPartes.message);
    erros.push("as partes do processo");
  }
  const partes = partesDb ?? [];

  if (erroLaudoProtocolado) {
    console.error(`Processo ${id}: falha ao checar laudo protocolado:`, erroLaudoProtocolado.message);
    erros.push("a liberação do Pós-laudo");
  }
  const temLaudoProtocolado = Boolean(laudoProtocolado);

  if (erroTotalProtocolados) {
    console.error(`Processo ${id}: falha ao contar documentos protocolados:`, erroTotalProtocolados.message);
    erros.push("o bloqueio de exclusão");
  }
  // Falha aqui trata como "tem protocolado" (mais seguro bloquear a exclusão
  // à toa do que liberar por engano) — nunca `Boolean(null)` viraria `false`.
  const temDocumentoProtocolado = erroTotalProtocolados ? true : Boolean(totalProtocolados);
  const podeAbrirPosLaudo = temLaudoProtocolado || ehAssistenciaTecnica;

  if (erroTipoLaudo) {
    console.error(`Processo ${id}: falha ao buscar tipo de laudo:`, erroTipoLaudo.message);
    erros.push("o tipo de laudo");
  }
  if (erroPrimeiraSecao) {
    console.error(`Processo ${id}: falha ao buscar a primeira seção:`, erroPrimeiraSecao.message);
    erros.push("o link de preenchimento do laudo");
  }
  const tipoLaudoNome = tipoLaudo?.nome ?? null;
  const primeiraSecaoId = primeiraSecao?.id ?? null;

  if (erroAnexos) {
    console.error(`Processo ${id}: falha ao buscar anexo da análise da contestação:`, erroAnexos.message);
    erros.push("o anexo da análise da contestação");
  }
  let anexosContestacao: { id: string; nomeArquivo: string; signedUrl: string | null }[] = [];
  if (temAnaliseContestacao) {
    const lista = anexosDb ?? [];
    let urlPorCaminho = new Map<string, string | null>();
    if (lista.length > 0) {
      const { data: assinadas, error: erroAssinadas } = await supabase.storage
        .from(BUCKET_DOCUMENTOS)
        .createSignedUrls(
          lista.map((d) => d.storage_path),
          URL_ASSINADA_VALIDADE_SEGUNDOS,
        );
      if (erroAssinadas) {
        console.error(`Processo ${id}: falha ao gerar link do anexo:`, erroAssinadas.message);
        erros.push("os links do anexo da análise da contestação");
      }
      if (assinadas) urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
    }
    anexosContestacao = lista.map((d) => ({
      id: d.id,
      nomeArquivo: d.nome_arquivo,
      signedUrl: urlPorCaminho.get(d.storage_path) ?? null,
    }));
  }

  if (erroViabilidadeStatus) {
    console.error(`Processo ${id}: falha ao buscar status da Análise de Viabilidade:`, erroViabilidadeStatus.message);
    erros.push("o status da Análise de Viabilidade");
  }
  const nomesPoloAtivo = partes.filter((p) => p.polo === "ativo").map((p) => p.nome);
  const nomesPoloPassivo = partes.filter((p) => p.polo === "passivo").map((p) => p.nome);

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
    <main className="p-8 space-y-6 max-w-[1600px] mx-auto">
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

      {erros.length > 0 && (
        <BannerErroConsulta mensagem={`Não consegui carregar agora: ${erros.join(", ")}. O resto da página segue normal.`} />
      )}

      <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6">
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Tipo de trabalho">{TIPO_TRABALHO_ROTULOS[processo.tipo_trabalho] ?? processo.tipo_trabalho}</Campo>
          <Campo rotulo={processo.tipo_trabalho === "assistencia_tecnica" ? "Área da demanda" : "Tipo de laudo"}>
            {tipoLaudoNome ?? "—"}
          </Campo>

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
              <Campo rotulo="Data da contratação">
                {processo.data_contratacao ? dataCurta(processo.data_contratacao) : "—"}
              </Campo>
              <Campo rotulo="Prazo contratual de entrega">
                {processo.prazo_contratual_entrega ? dataCurta(processo.prazo_contratual_entrega) : "—"}
              </Campo>
              <Campo rotulo="Etapas contratadas" colSpan>
                {processo.etapas_contratadas && processo.etapas_contratadas.length > 0 ? (
                  <ol className="space-y-1">
                    {ETAPAS_CONTRATADAS_ORDENADAS.filter((e) => processo.etapas_contratadas!.includes(e)).map((e, i) => (
                      <li key={e} className="flex items-center gap-2">
                        <span className="text-nevoa-400 dark:text-nevoa-600 tabular-nums text-xs w-4 text-right">{i + 1}.</span>
                        <span>{ETAPA_CONTRATADA_ROTULOS[e] ?? e}</span>
                        {e === "analise_viabilidade" && viabilidadeStatusDb?.status && (
                          <Selo variante="neutro">{VIABILIDADE_STATUS_ROTULOS[viabilidadeStatusDb.status]}</Selo>
                        )}
                        {e === "estrategia_pericial" && (
                          <Selo variante={processo.estrategia_pericial_reuniao_em ? "sucesso" : "atencao"}>
                            {processo.estrategia_pericial_reuniao_em ? `Reunião ${dataCurta(processo.estrategia_pericial_reuniao_em)}` : "Aguardando reunião"}
                          </Selo>
                        )}
                        {e === "analise_contestacao" && (
                          <Selo variante={anexosContestacao.length > 0 ? "sucesso" : "atencao"}>
                            {anexosContestacao.length > 0 ? "Arquivo anexado" : "Aguardando arquivo"}
                          </Selo>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  "—"
                )}
              </Campo>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-4">
          Situação e financeiro
        </h2>
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Situação do processo">
            {processo.situacao_processo ? (
              <Selo variante={varianteSituacaoProcesso(processo.situacao_processo)}>
                {processo.situacao_processo}
              </Selo>
            ) : (
              "—"
            )}
          </Campo>
          <Campo rotulo="Situação financeira">{processo.situacao_financeira ?? "—"}</Campo>
          <Campo rotulo="Ação / Objeto" colSpan>
            {processo.acao_objeto ?? "—"}
          </Campo>
          <Campo rotulo="Valor do serviço">{moedaBRL(processo.valor_processo)}</Campo>
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

      <DocumentosPendentesPanel
        processoId={processo.id}
        solicitadoEm={processo.documentos_solicitados_em}
        descricao={processo.documentos_solicitados_descricao}
      />

      {processo.tipo_trabalho === "pericia_judicial" && (
        <ProximoMarcoHonorariosPanel
          processoId={processo.id}
          marcoEm={processo.honorarios_proximo_marco_em}
          descricao={processo.honorarios_proximo_marco_descricao}
        />
      )}

      <NotaFiscalPanel
        processoId={processo.id}
        emitida={processo.nota_fiscal_emitida}
        numero={processo.nota_fiscal_numero}
      />

      {temAnaliseViabilidade && (
        <Link
          href={`/processos/${processo.id}/viabilidade`}
          className="flex items-center justify-between gap-3 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 hover:border-petroleo-400 dark:hover:border-petroleo-600 transition-colors"
        >
          <div>
            <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
              Análise de Viabilidade Técnico-Pericial
            </h3>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">Abrir a janela estruturada da análise</p>
          </div>
          <span className="text-petroleo-600 dark:text-petroleo-400 text-sm shrink-0">Abrir →</span>
        </Link>
      )}

      {temEstrategiaPericial && (
        <ReuniaoEstrategiaPericialPanel
          processoId={processo.id}
          reuniaoEm={processo.estrategia_pericial_reuniao_em}
        />
      )}

      {temAnaliseContestacao && (
        <AnexoEtapaAtPanel
          processoId={processo.id}
          etapa="analise_contestacao"
          tituloEtapa="Análise da contestação"
          documentos={anexosContestacao}
        />
      )}

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
        {processo.tipo_trabalho === "pericia_judicial" && (
          <Link href={`/processos/${processo.id}/fluxo-principal`} className={classesBotao("secundaria")}>
            Fluxo Principal
          </Link>
        )}
        <Link href={`/processos/${processo.id}/laudo`} className={classesBotao("secundaria")}>
          Laudo final
        </Link>
        {podeAbrirPosLaudo ? (
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

      <div className="pt-4 border-t border-nevoa-200 dark:border-nevoa-800">
        <ExcluirProcessoButton processoId={processo.id} temDocumentoProtocolado={temDocumentoProtocolado} />
      </div>
    </main>
  );
}
