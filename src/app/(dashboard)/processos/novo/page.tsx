import { createClient } from "@/lib/supabase/server";
import { NovoProcessoForm } from "@/features/processos/novo-processo-form";

export default async function NovoProcessoPage() {
  const supabase = await createClient();
  const { data: tiposLaudo } = await supabase
    .from("tipos_laudo")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return (
    <main className="p-8 max-w-2xl">
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mb-6">Novo processo</h1>
      <NovoProcessoForm tiposLaudo={tiposLaudo ?? []} />
    </main>
  );
}
