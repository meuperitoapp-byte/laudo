import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { AceitePanel } from "@/features/fluxo-principal/aceite-panel";
import { DepositoPanel } from "@/features/fluxo-principal/deposito-panel";
import { AgendamentoPanel } from "@/features/fluxo-principal/agendamento-panel";
import type { VersaoDocumento } from "@/features/fluxo-principal/gerar-documento-panel";
import type { LaudoGeradoTipo } from "@/types/enums";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60;

/**
 * Fluxo Principal do Perito Judicial — fase inicial (fatia 2): Aceite do
 * Encargo Pericial, Informação de Dados para Depósito dos Honorários e
 * Comunicação de Agendamento da Perícia. Cada bloco tem seu formulário de
 * dados (colunas que existiam desde a fatia 0 mas não tinham tela nenhuma
 * pra editar) + geração/versões/protocolar, mesmo padrão do Pós-Laudo.
 *
 * Honorários fica de fora desta tela — schema pronto (migration
 * 20260911130000), mas sem petição avulsa: só entra quando a Manifestação
 * Consolidada existir (ver docs/plano-modulo-fluxo-principal.md §2-3).
 */
export default async function FluxoPrincipalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const [{ data: processo }, { data: config }, { data: versoesDb }] = await Promise.all([
    supabase.from("processos").select("*").eq("id", processoId).single(),
    supabase.from("configuracoes").select("*").maybeSingle(),
    supabase
      .from("laudos_gerados")
      .select("*")
      .eq("processo_id", processoId)
      .in("tipo", ["aceite_pericial", "dados_deposito", "agendamento_pericia"])
      .order("versao", { ascending: false }),
  ]);
  if (!processo) notFound();
  if (processo.tipo_trabalho !== "pericia_judicial") {
    notFound();
  }

  const versoes = versoesDb ?? [];
  const caminhos = versoes.flatMap((v) => [v.storage_path_pdf, v.storage_path_docx].filter((c): c is string => Boolean(c)));
  let urlPorCaminho = new Map<string, string | null>();
  if (caminhos.length > 0) {
    const { data: assinadas } = await supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .createSignedUrls(caminhos, URL_ASSINADA_VALIDADE_SEGUNDOS);
    if (assinadas) urlPorCaminho = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
  }

  function versoesDoTipo(tipo: LaudoGeradoTipo): VersaoDocumento[] {
    return versoes
      .filter((v) => v.tipo === tipo)
      .map((v) => ({
        id: v.id,
        versao: v.versao,
        criadoEm: v.created_at,
        urlPdf: v.storage_path_pdf ? (urlPorCaminho.get(v.storage_path_pdf) ?? null) : null,
        urlDocx: v.storage_path_docx ? (urlPorCaminho.get(v.storage_path_docx) ?? null) : null,
        protocolado: v.protocolado,
        protocoladoEm: v.protocolado_em,
        protocoloId: v.protocolo_id,
      }));
  }

  const temDadosBancariosCadastrados = Boolean(config?.dados_bancarios_titular?.trim());

  const titulo =
    processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl space-y-10">
      <div>
        <Link
          href={`/processos/${processoId}`}
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar para o processo
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
          Fluxo Principal
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">{titulo}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">
          Aceite do Encargo Pericial
        </h2>
        <AceitePanel processo={processo} versoes={versoesDoTipo("aceite_pericial")} />
      </section>

      <section className="space-y-3">
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">
          Dados para Depósito dos Honorários
        </h2>
        <DepositoPanel
          processo={processo}
          temDadosBancariosCadastrados={temDadosBancariosCadastrados}
          versoes={versoesDoTipo("dados_deposito")}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">
          Agendamento da Perícia
        </h2>
        <AgendamentoPanel processo={processo} versoes={versoesDoTipo("agendamento_pericia")} />
      </section>
    </main>
  );
}
