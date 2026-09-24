import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirAnaliseContestacao } from "@/features/contestacao/actions";
import { ArgumentosContestacaoPanel } from "@/features/contestacao/argumentos-panel";
import { ProximaAcaoContestacaoPanel } from "@/features/contestacao/proxima-acao-panel";
import { listarNomesResponsaveis } from "@/lib/supabase/responsaveis";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

/**
 * Tela de raciocínio/decisão da Análise da Contestação (§5 do modelo: "não é
 * um documento extenso"). Sem geração de PDF aqui — o produto externo é a
 * Orientação para Réplica, que lê `contestacao_argumentos.incluir_na_replica`.
 */
export default async function AnaliseContestacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, etapas_contratadas")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) {
    console.error(`Análise da contestação: falha ao buscar processo ${processoId}:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  if (!(processo.etapas_contratadas?.includes("analise_contestacao") ?? false)) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
          <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Análise da contestação não contratada</h1>
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">Esta etapa não está marcada nas etapas contratadas deste processo.</p>
          <Link href={`/processos/${processoId}`} className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400">
            ← Voltar pro processo
          </Link>
        </div>
      </main>
    );
  }

  const analiseResultado = await garantirAnaliseContestacao(processoId);
  if ("error" in analiseResultado) {
    console.error(`Análise da contestação: falha ao garantir registro (${processoId}):`, analiseResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela agora" />;
  }
  const analise = analiseResultado.data;

  const [{ data: argumentosDb, error: erroArgumentos }, nomesResponsaveis] = await Promise.all([
    supabase.from("contestacao_argumentos").select("*").eq("analise_id", analise.id).order("ordem", { ascending: true }),
    listarNomesResponsaveis(),
  ]);
  if (erroArgumentos) {
    console.error(`Análise da contestação: falha ao listar argumentos (${processoId}):`, erroArgumentos.message);
  }

  const nomeCaso = processo.periciando_nome || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/processos/${processoId}`} className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← {nomeCaso}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Análise da Contestação</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Transforma os argumentos da contestação em decisões técnico-periciais — alimenta a Orientação para Réplica sem redigitação.
        </p>
      </div>

      {erroArgumentos && <BannerErroConsulta mensagem="Não consegui carregar a lista de argumentos agora." />}

      <ArgumentosContestacaoPanel analiseId={analise.id} processoId={processoId} argumentos={argumentosDb ?? []} />
      <ProximaAcaoContestacaoPanel analise={analise} nomesResponsaveis={nomesResponsaveis} />
    </main>
  );
}
