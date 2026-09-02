import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { ProcessosFiltros } from "@/features/processos/processos-filtros";
import { SITUACOES_FINANCEIRAS_SEED, mesclarSugestoes } from "@/features/processos/catalogos";
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

  const [{ data: processos }, { data: tiposLaudo }, { data: partesDb }, { data: financeirasDb }] =
    await Promise.all([
      query,
      supabase.from("tipos_laudo").select("id, nome").order("ordem", { ascending: true }),
      supabase.from("processo_partes").select("processo_id, polo, nome, ordem").eq("polo", "ativo").order("ordem"),
      supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    ]);

  const nomePorTipoLaudo = new Map((tiposLaudo ?? []).map((t) => [t.id, t.nome]));
  const primeiroNomePoloAtivoPorProcesso = new Map<string, string>();
  for (const parte of partesDb ?? []) {
    if (!primeiroNomePoloAtivoPorProcesso.has(parte.processo_id)) {
      primeiroNomePoloAtivoPorProcesso.set(parte.processo_id, parte.nome);
    }
  }

  const filtrouAlgo = Object.values(f).some((v) => v);

  // Com o filtro de tipo de trabalho ativo (o usuário chegou aqui pela tela de
  // escolha), "Novo processo" já leva o tipo pro formulário; sem filtro, cai na
  // tela de escolha.
  const hrefNovo =
    f.tipoTrabalho === "pericia_judicial" || f.tipoTrabalho === "assistencia_tecnica"
      ? `/processos/novo?tipo=${f.tipoTrabalho}`
      : "/processos/novo";

  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Processos</h1>
        <Link href={hrefNovo} className={classesBotao("primaria")}>
          Novo processo
        </Link>
      </div>

      <ProcessosFiltros
        tiposLaudo={tiposLaudo ?? []}
        situacoesFinanceiras={mesclarSugestoes(SITUACOES_FINANCEIRAS_SEED, financeirasDb)}
      />

      {!processos || processos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-6">
          {filtrouAlgo
            ? "Nenhum processo encontrado com esses filtros."
            : "Nenhum processo em andamento. Use os filtros acima para ver os finalizados."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-nevoa-200 dark:border-nevoa-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left bg-nevoa-50 dark:bg-nevoa-900 border-b border-nevoa-200 dark:border-nevoa-800">
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Processo / Periciando(a)</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Tipo de trabalho</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Tipo de laudo</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Situação</th>
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
                    {p.situacao_processo || "—"}
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
