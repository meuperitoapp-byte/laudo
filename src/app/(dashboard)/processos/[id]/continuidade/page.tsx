import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContinuidadePanel } from "@/features/continuidade/continuidade-panel";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function ContinuidadeProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, numero_processo, parte_autora, relacionamento_id")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Continuidade: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  const [{ data: oportunidadesDb, error: erroOportunidades }, { data: regrasDb, error: erroRegras }] = await Promise.all([
    supabase.from("continuidade_oportunidades").select("*").eq("processo_id", processoId),
    supabase.from("continuidade_regras").select("*").order("servico_origem", { ascending: true }),
  ]);
  if (erroOportunidades) console.error(`Continuidade (${processoId}): falha ao buscar oportunidades:`, erroOportunidades.message);
  if (erroRegras) console.error(`Continuidade (${processoId}): falha ao buscar regras:`, erroRegras.message);

  const nomeCaso = processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/processos/${processoId}`} className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← {nomeCaso}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Continuidade de serviços</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Registre um serviço concluído como oportunidade de continuidade e acompanhe o follow-up.
        </p>
      </div>
      {(erroOportunidades || erroRegras) && <BannerErroConsulta mensagem="Não foi possível carregar todos os dados agora." />}
      <ContinuidadePanel
        processoId={processoId}
        relacionamentoId={processo.relacionamento_id}
        oportunidades={oportunidadesDb ?? []}
        regras={regrasDb ?? []}
      />
    </main>
  );
}
