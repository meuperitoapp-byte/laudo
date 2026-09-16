import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcessoForm } from "@/features/processos/processo-form";
import {
  SITUACOES_FINANCEIRAS_SEED,
  VARA_ESPECIALIZACAO_SEED,
  mesclarSugestoes,
} from "@/features/processos/catalogos";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function EditarProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: processo, error: erroProcesso },
    { data: tiposLaudo, error: erroTiposLaudo },
    { data: varasDb, error: erroVaras },
    { data: comarcasDb, error: erroComarcas },
    { data: financeirasDb, error: erroFinanceiras },
    { data: acoesDb, error: erroAcoes },
    { data: escritoriosDb, error: erroEscritorios },
  ] = await Promise.all([
    supabase.from("processos").select("*").eq("id", id).single(),
    supabase.from("tipos_laudo").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("processos").select("valor:vara_numero").not("vara_numero", "is", null),
    supabase.from("processos").select("valor:comarca_subsecao").not("comarca_subsecao", "is", null),
    supabase.from("processos").select("valor:situacao_financeira").not("situacao_financeira", "is", null),
    supabase.from("processos").select("valor:acao_objeto").not("acao_objeto", "is", null),
    supabase.from("processos").select("valor:escritorio_indicacao").not("escritorio_indicacao", "is", null),
  ]);

  // Mesmo critério do restante da auditoria: erro real na consulta do
  // processo NUNCA pode virar notFound() (ela leria como "caso sumiu").
  if (erroProcesso && erroProcesso.code !== "PGRST116") {
    console.error(`Editar processo ${id}: falha ao buscar processo:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar este processo para edição agora" />;
  }
  if (!processo) {
    notFound();
  }
  if (erroTiposLaudo) {
    console.error(`Editar processo ${id}: falha ao buscar tipos de laudo:`, erroTiposLaudo.message);
  }
  for (const [rotulo, erro] of [
    ["varas", erroVaras],
    ["comarcas", erroComarcas],
    ["situações financeiras", erroFinanceiras],
    ["ações/objetos", erroAcoes],
    ["escritórios de indicação", erroEscritorios],
  ] as const) {
    if (erro) console.error(`Editar processo ${id}: falha ao buscar sugestões de ${rotulo}:`, erro.message);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
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
      {erroTiposLaudo && (
        <BannerErroConsulta mensagem="Não consegui carregar os tipos de laudo agora — recarregue a página antes de trocar a natureza do processo." />
      )}
      <ProcessoForm
        modo="editar"
        processo={processo}
        tiposLaudo={tiposLaudo ?? []}
        sugestoesVara={mesclarSugestoes(VARA_ESPECIALIZACAO_SEED, varasDb)}
        sugestoesComarca={mesclarSugestoes([], comarcasDb)}
        sugestoesFinanceira={mesclarSugestoes(SITUACOES_FINANCEIRAS_SEED, financeirasDb)}
        sugestoesAcaoObjeto={mesclarSugestoes([], acoesDb)}
        sugestoesEscritorioIndicacao={mesclarSugestoes([], escritoriosDb)}
      />
    </main>
  );
}
