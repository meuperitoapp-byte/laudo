import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { ConfiguracoesForm } from "@/features/configuracoes/configuracoes-form";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

async function urlAtivoGlobal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tipo: "assinatura_perito" | "logomarca",
): Promise<string | null> {
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .is("processo_id", null)
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc?.storage_path) return null;
  const { data } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(doc.storage_path, VALIDADE_URL_SEGUNDOS);
  return data?.signedUrl ?? null;
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const [{ data: config }, urlAssinatura, urlLogomarca] = await Promise.all([
    supabase.from("configuracoes").select("*").maybeSingle(),
    urlAtivoGlobal(supabase, "assinatura_perito"),
    urlAtivoGlobal(supabase, "logomarca"),
  ]);

  return (
    <main className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Configurações</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Identidade visual e dados de contato aplicados aos documentos gerados.
        </p>
      </div>
      <ConfiguracoesForm config={config ?? null} urlAssinatura={urlAssinatura} urlLogomarca={urlLogomarca} />
    </main>
  );
}
