import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { ProcessosFiltros } from "@/features/processos/processos-filtros";
import { ExcluirProcessoButton } from "@/features/processos/excluir-processo-button";
import {
  SITUACOES_FINANCEIRAS_SEED,
  mesclarSugestoes,
  varianteSituacaoProcesso,
  ETAPA_CONTRATADA_ROTULOS,
  ETAPAS_CONTRATADAS_ORDENADAS,
} from "@/features/processos/catalogos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import type { TipoTrabalhoProcesso } from "@/types/enums";

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

/** Primeiro valor não-vazio de um search param (Next entrega string | string[] | undefined). */
function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
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

  const supabase = await createClient();

  let query = supabase.from("processos").select("*").order("created_at", { ascending: false });
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

  const [
    { data: processos, error: erroProcessos },
    { data: tiposLaudo, error: erroTiposLaudo },
    { data: partesDb, error: erroPartes },
    { data: financeirasDb, error: erroFinanceiras },
    { data: protocoladosDb, error: erroProtocolados },
  ] = await Promise.all([
    query,
    supabase.from("tipos_laudo").select("id, nome").order("ordem", { ascending: true }),
    supabase.from("processo_partes").select("processo_id, polo, nome, ordem").eq("polo", "ativo").order("ordem"),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    // Mesmo gate de exclusão do detalhe do processo (ver [id]/page.tsx):
    // qualquer documento protocolado bloqueia excluir. Buscado em lote aqui
    // pra ExcluirProcessoButton, sem duplicar a query por linha da tabela.
    supabase.from("laudos_gerados").select("processo_id").eq("protocolado", true),
  ]);
  // Mesma classe de bug do dashboard "0 processos" (21/09/2026): sem checar
  // `error`, a lista principal falhando viraria "Nenhum processo em
  // andamento" — estado vazio normal, mas enganoso.
  if (erroProcessos) console.error("Processos: falha ao listar:", erroProcessos.message);
  if (erroTiposLaudo) console.error("Processos: falha ao buscar tipos de laudo:", erroTiposLaudo.message);
  if (erroPartes) console.error("Processos: falha ao buscar partes:", erroPartes.message);
  if (erroFinanceiras) console.error("Processos: falha ao buscar situações financeiras:", erroFinanceiras.message);
  if (erroProtocolados) console.error("Processos: falha ao buscar documentos protocolados:", erroProtocolados.message);

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

  // Com o filtro de tipo de trabalho ativo (o usuário chegou aqui pela tela de
  // escolha), "Novo processo" já leva o tipo pro formulário; sem filtro, cai na
  // tela de escolha.
  const hrefNovo =
    f.tipoTrabalho === "pericia_judicial" || f.tipoTrabalho === "assistencia_tecnica"
      ? `/processos/novo?tipo=${f.tipoTrabalho}`
      : "/processos/novo";

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Demandas</h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
            {processos?.length ?? 0} {processos?.length === 1 ? "demanda listada" : "demandas listadas"}
          </p>
        </div>
        <Link href={hrefNovo} className={classesBotao("primaria")}>
          Nova demanda
        </Link>
      </div>

      {erroProcessos && (
        <BannerErroConsulta mensagem={`Não consegui carregar as demandas agora: ${erroProcessos.message}. A lista abaixo não é confiável até isso ser corrigido.`} />
      )}

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
                  <td className="py-2.5 px-4">
                    <ExcluirProcessoButton
                      processoId={p.id}
                      temDocumentoProtocolado={
                        processosComDocumentoProtocolado === null || processosComDocumentoProtocolado.has(p.id)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
