import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProcessoForm } from "@/features/processos/processo-form";
import { EscolhaTipoTrabalho } from "@/features/processos/escolha-tipo-trabalho";
import {
  SITUACOES_FINANCEIRAS_SEED,
  SITUACOES_PROCESSO_SEED,
  VARA_ESPECIALIZACAO_SEED,
  mesclarSugestoes,
} from "@/features/processos/catalogos";

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
      <main className="p-8 max-w-2xl">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mb-6">Novo processo</h1>
        <EscolhaTipoTrabalho />
      </main>
    );
  }

  const supabase = await createClient();
  const [
    { data: tiposLaudo },
    { data: varasDb },
    { data: comarcasDb },
    { data: situacoesDb },
    { data: financeirasDb },
    { data: acoesDb },
  ] = await Promise.all([
    supabase.from("tipos_laudo").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("processos").select("valor:vara_numero").not("vara_numero", "is", null),
    supabase.from("processos").select("valor:comarca_subsecao").not("comarca_subsecao", "is", null),
    supabase.from("processos").select("valor:situacao_processo").not("situacao_processo", "is", null),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    supabase.from("processos").select("valor:acao_objeto").not("acao_objeto", "is", null),
  ]);

  const rotuloTipo = tipoTrabalho === "pericia_judicial" ? "Perícia Judicial" : "Assistência Técnica";

  return (
    <main className="p-8 max-w-2xl space-y-6">
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
      <ProcessoForm
        modo="criar"
        tipoTrabalhoInicial={tipoTrabalho}
        tiposLaudo={tiposLaudo ?? []}
        sugestoesVara={mesclarSugestoes(VARA_ESPECIALIZACAO_SEED, varasDb)}
        sugestoesComarca={mesclarSugestoes([], comarcasDb)}
        sugestoesSituacao={mesclarSugestoes(SITUACOES_PROCESSO_SEED, situacoesDb)}
        sugestoesFinanceira={mesclarSugestoes(SITUACOES_FINANCEIRAS_SEED, financeirasDb)}
        sugestoesAcaoObjeto={mesclarSugestoes([], acoesDb)}
      />
    </main>
  );
}
