import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { ConfiguracoesForm } from "@/features/configuracoes/configuracoes-form";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import { classesBotao } from "@/components/ui/button";
import { obterContextoAcesso, podeAdministrarAcessos } from "@/features/acessos/contexto";

const VALIDADE_URL_SEGUNDOS = 60 * 60;

async function urlAtivoGlobal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tipo: "assinatura_perito" | "logomarca",
): Promise<{ url: string | null; erro: boolean }> {
  const { data: doc, error: erroDoc } = await supabase
    .from("documentos")
    .select("storage_path")
    .is("processo_id", null)
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroDoc) {
    console.error(`Configurações: falha ao buscar ${tipo}:`, erroDoc.message);
    return { url: null, erro: true };
  }
  if (!doc?.storage_path) return { url: null, erro: false };
  const { data, error: erroUrl } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(doc.storage_path, VALIDADE_URL_SEGUNDOS);
  if (erroUrl) {
    console.error(`Configurações: falha ao gerar link de ${tipo}:`, erroUrl.message);
    return { url: null, erro: true };
  }
  return { url: data?.signedUrl ?? null, erro: false };
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: config, error: erroConfig }, assinatura, logomarca, contexto] = await Promise.all([
    supabase.from("configuracoes").select("*").maybeSingle(),
    urlAtivoGlobal(supabase, "assinatura_perito"),
    urlAtivoGlobal(supabase, "logomarca"),
    user?.email ? obterContextoAcesso(supabase, user.email) : Promise.resolve(null),
  ]);
  if (erroConfig) console.error("Configurações: falha ao buscar configuração:", erroConfig.message);
  const houveErro = Boolean(erroConfig) || assinatura.erro || logomarca.erro;
  const mostrarLinkAcessos = contexto !== null && podeAdministrarAcessos(contexto);

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Configurações</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Identidade visual e dados de contato aplicados aos documentos gerados.
        </p>
      </div>
      {houveErro && (
        <BannerErroConsulta mensagem="Não consegui carregar tudo agora — alguns dados abaixo podem estar incompletos." />
      )}
      {mostrarLinkAcessos && (
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-petroleo-100 dark:bg-petroleo-900/40 text-petroleo-600 dark:text-petroleo-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Perfis de acesso</h2>
              <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
                Controle quem enxerga o quê no sistema — só você vê esta seção.
              </p>
            </div>
          </div>
          <Link href="/configuracoes/acessos" className={classesBotao("primaria", "shrink-0")}>
            Gerenciar perfis de acesso
          </Link>
        </div>
      )}
      <ConfiguracoesForm config={config ?? null} urlAssinatura={assinatura.url} urlLogomarca={logomarca.url} />
    </main>
  );
}
