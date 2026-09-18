import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProcessoForm } from "@/features/processos/processo-form";
import { EscolhaTipoTrabalho } from "@/features/processos/escolha-tipo-trabalho";
import {
  SITUACOES_FINANCEIRAS_SEED,
  VARA_ESPECIALIZACAO_SEED,
  ORGAO_CLASSE_SEED,
  mesclarSugestoes,
} from "@/features/processos/catalogos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

const TIPOS_VALIDOS = ["pericia_judicial", "assistencia_tecnica"] as const;
type TipoTrabalho = (typeof TIPOS_VALIDOS)[number];

export default async function NovoProcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const tipoTrabalho = TIPOS_VALIDOS.includes(tipo as TipoTrabalho) ? (tipo as TipoTrabalho) : null;

  // Primeira página: só a escolha entre Perícia Judicial e Assistência Técnica
  // (pedido da cliente). O resto do cadastro só aparece depois, já com o tipo
  // definido via ?tipo= na URL.
  if (!tipoTrabalho) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mb-6">Novo processo</h1>
        <EscolhaTipoTrabalho />
      </main>
    );
  }

  const supabase = await createClient();
  const [
    { data: tiposLaudo, error: erroTiposLaudo },
    { data: varasDb, error: erroVaras },
    { data: comarcasDb, error: erroComarcas },
    { data: financeirasDb, error: erroFinanceiras },
    { data: acoesDb, error: erroAcoes },
    { data: escritoriosDb, error: erroEscritorios },
    { data: orgaosClasseDb, error: erroOrgaosClasse },
  ] = await Promise.all([
    supabase.from("tipos_laudo").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("processos").select("valor:vara_numero").not("vara_numero", "is", null),
    supabase.from("processos").select("valor:comarca_subsecao").not("comarca_subsecao", "is", null),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    supabase.from("processos").select("valor:acao_objeto").not("acao_objeto", "is", null),
    supabase.from("processos").select("valor:escritorio_indicacao").not("escritorio_indicacao", "is", null),
    supabase.from("processos").select("valor:orgao_classe").not("orgao_classe", "is", null),
  ]);

  // `tiposLaudo` é crítico (sem ele não dá pra escolher a natureza do
  // processo) — os demais só alimentam sugestão de autocomplete, então uma
  // falha ali é registrada mas não bloqueia o cadastro.
  if (erroTiposLaudo) {
    console.error("Novo processo: falha ao buscar tipos de laudo:", erroTiposLaudo.message);
  }
  for (const [rotulo, erro] of [
    ["varas", erroVaras],
    ["comarcas", erroComarcas],
    ["situações financeiras", erroFinanceiras],
    ["ações/objetos", erroAcoes],
    ["escritórios de indicação", erroEscritorios],
    ["órgãos de classe", erroOrgaosClasse],
  ] as const) {
    if (erro) console.error(`Novo processo: falha ao buscar sugestões de ${rotulo}:`, erro.message);
  }

  const rotuloTipo = tipoTrabalho === "pericia_judicial" ? "Perícia Judicial" : "Assistência Técnica";

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/processos/novo"
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Trocar tipo de trabalho
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
          Novo processo — {rotuloTipo}
        </h1>
      </div>
      {erroTiposLaudo && (
        <BannerErroConsulta mensagem="Não consegui carregar os tipos de laudo agora — recarregue a página antes de escolher a natureza do processo." />
      )}
      <ProcessoForm
        modo="criar"
        tipoTrabalhoInicial={tipoTrabalho}
        tiposLaudo={tiposLaudo ?? []}
        sugestoesVara={mesclarSugestoes(VARA_ESPECIALIZACAO_SEED, varasDb)}
        sugestoesComarca={mesclarSugestoes([], comarcasDb)}
        sugestoesFinanceira={mesclarSugestoes(SITUACOES_FINANCEIRAS_SEED, financeirasDb)}
        sugestoesAcaoObjeto={mesclarSugestoes([], acoesDb)}
        sugestoesEscritorioIndicacao={mesclarSugestoes([], escritoriosDb)}
        sugestoesOrgaoClasse={mesclarSugestoes(ORGAO_CLASSE_SEED, orgaosClasseDb)}
      />
    </main>
  );
}
