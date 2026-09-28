import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegrasPanel } from "@/features/continuidade/regras-panel";
import { ConfiguracaoCreditoForm } from "@/features/relacionamento/configuracao-credito-form";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function ContinuidadeConfigPage() {
  const supabase = await createClient();
  const [{ data: regrasDb, error: erroRegras }, { data: configDb, error: erroConfig }] = await Promise.all([
    supabase.from("continuidade_regras").select("*").order("servico_origem", { ascending: true }),
    supabase.from("relacionamento_configuracoes").select("*").eq("id", true).maybeSingle(),
  ]);
  if (erroRegras) console.error("Continuidade — config: falha ao buscar regras:", erroRegras.message);
  if (erroConfig) console.error("Continuidade — config: falha ao buscar configurações:", erroConfig.message);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/relacionamento" className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Configurações de Relacionamento</h1>
      </div>
      {(erroRegras || erroConfig) && <BannerErroConsulta mensagem="Não consegui carregar todas as configurações agora." />}
      <RegrasPanel regras={regrasDb ?? []} />
      <ConfiguracaoCreditoForm valorAtual={configDb?.valor_credito_indicacao_padrao ?? 0} />
    </main>
  );
}
