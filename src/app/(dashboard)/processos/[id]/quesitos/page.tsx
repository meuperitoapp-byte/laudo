import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuesitosPanel } from "@/features/quesitos/quesitos-panel";
import { ErroConsultaPagina, BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function QuesitosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora, numero_processo")
    .eq("id", processoId)
    .single();

  if (erroProcesso && erroProcesso.code !== "PGRST116") {
    console.error(`Quesitos do processo ${processoId}: falha ao buscar processo:`, erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar os quesitos agora" />;
  }
  if (!processo) {
    notFound();
  }

  const { data: quesitos, error: erroQuesitos } = await supabase
    .from("quesitos")
    .select("*")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });
  if (erroQuesitos) {
    console.error(`Quesitos do processo ${processoId}: falha ao listar:`, erroQuesitos.message);
  }

  const titulo =
    processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Quesitos</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">{titulo}</p>

      {erroQuesitos && (
        <div className="mb-6">
          <BannerErroConsulta mensagem="Não consegui carregar a lista de quesitos agora." />
        </div>
      )}

      <QuesitosPanel processoId={processoId} quesitos={quesitos ?? []} />
    </main>
  );
}
