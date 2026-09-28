import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RelacionamentoForm } from "@/features/relacionamento/relacionamento-form";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function NovoRelacionamentoPage() {
  const supabase = await createClient();
  const { data: indicadoresDb, error } = await supabase
    .from("relacionamentos")
    .select("id, nome")
    .eq("tipo", "advogado_escritorio")
    .order("nome", { ascending: true });
  if (error) console.error("Novo relacionamento: falha ao buscar possíveis indicadores:", error.message);

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/relacionamento" className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Novo cadastro — Relacionamento</h1>
      </div>
      {error && <BannerErroConsulta mensagem="Não consegui carregar a lista de possíveis indicadores agora — recarregue a página se for cadastrar uma indicação." />}
      <RelacionamentoForm modo="criar" possiveisIndicadores={indicadoresDb ?? []} />
    </main>
  );
}
