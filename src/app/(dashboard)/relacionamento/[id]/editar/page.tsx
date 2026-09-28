import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RelacionamentoForm } from "@/features/relacionamento/relacionamento-form";
import { BannerErroConsulta, ErroConsultaPagina } from "@/components/ui/erro-consulta";

export default async function EditarRelacionamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: relacionamento, error: erroRelacionamento }, { data: indicadoresDb, error: erroIndicadores }] = await Promise.all([
    supabase.from("relacionamentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("relacionamentos").select("id, nome").eq("tipo", "advogado_escritorio").order("nome", { ascending: true }),
  ]);
  if (erroRelacionamento) {
    console.error(`Editar relacionamento ${id}: falha ao buscar cadastro:`, erroRelacionamento.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar este cadastro para edição agora" />;
  }
  if (!relacionamento) notFound();
  if (erroIndicadores) console.error(`Editar relacionamento ${id}: falha ao buscar possíveis indicadores:`, erroIndicadores.message);

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/relacionamento/${id}`} className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Editar — {relacionamento.nome}</h1>
      </div>
      {erroIndicadores && <BannerErroConsulta mensagem="Não consegui carregar a lista de possíveis indicadores agora." />}
      <RelacionamentoForm modo="editar" relacionamento={relacionamento} possiveisIndicadores={indicadoresDb ?? []} />
    </main>
  );
}
