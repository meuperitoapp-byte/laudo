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
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-6">Novo processo</h1>
      <NovoProcessoForm tiposLaudo={tiposLaudo ?? []} />
    </main>
  );
}
