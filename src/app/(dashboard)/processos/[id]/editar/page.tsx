import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcessoForm } from "@/features/processos/processo-form";
import {
  SITUACOES_FINANCEIRAS_SEED,
  SITUACOES_PROCESSO_SEED,
  VARA_ESPECIALIZACAO_SEED,
  mesclarSugestoes,
} from "@/features/processos/catalogos";

export default async function EditarProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: processo },
    { data: tiposLaudo },
    { data: varasDb },
    { data: comarcasDb },
    { data: situacoesDb },
    { data: financeirasDb },
    { data: acoesDb },
  ] = await Promise.all([
    supabase.from("processos").select("*").eq("id", id).single(),
    supabase.from("tipos_laudo").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("processos").select("valor:vara_numero").not("vara_numero", "is", null),
    supabase.from("processos").select("valor:comarca_subsecao").not("comarca_subsecao", "is", null),
    supabase.from("processos").select("valor:situacao_processo").not("situacao_processo", "is", null),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    supabase.from("processos").select("valor:acao_objeto").not("acao_objeto", "is", null),
  ]);

  if (!processo) {
    notFound();
  }

  return (
    <main className="p-8 max-w-2xl space-y-6">
      <div>
        <Link
          href={`/processos/${id}`}
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          ← Voltar para o processo
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">
          Editar dados do processo
        </h1>
      </div>
      <ProcessoForm
        modo="editar"
        processo={processo}
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
