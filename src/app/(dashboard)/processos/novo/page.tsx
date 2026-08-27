import { createClient } from "@/lib/supabase/server";
import { NovoProcessoForm } from "@/features/processos/novo-processo-form";

/** Valores distintos já usados em processos anteriores — vira sugestão no combobox de Vara/Comarca (ver ComboboxCatalogo). Cresce sozinho, sem tela de administração. */
function valoresDistintos(rows: { valor: string | null }[] | null): string[] {
  const vistos = new Set<string>();
  for (const r of rows ?? []) {
    const v = r.valor?.trim();
    if (v) vistos.add(v);
  }
  return Array.from(vistos).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export default async function NovoProcessoPage() {
  const supabase = await createClient();
  const [{ data: tiposLaudo }, { data: varasDb }, { data: comarcasDb }] = await Promise.all([
    supabase.from("tipos_laudo").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("processos").select("valor:vara_numero").not("vara_numero", "is", null),
    supabase.from("processos").select("valor:comarca_subsecao").not("comarca_subsecao", "is", null),
  ]);

  return (
    <main className="p-8 max-w-2xl">
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mb-6">Novo processo</h1>
      <NovoProcessoForm
        tiposLaudo={tiposLaudo ?? []}
        sugestoesVara={valoresDistintos(varasDb)}
        sugestoesComarca={valoresDistintos(comarcasDb)}
      />
    </main>
  );
}
