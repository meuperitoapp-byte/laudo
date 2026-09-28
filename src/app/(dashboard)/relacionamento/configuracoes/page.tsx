import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegrasPanel } from "@/features/continuidade/regras-panel";
import { ConfiguracaoCreditoForm } from "@/features/relacionamento/configuracao-credito-form";
import { ConfiguracaoCalendarioForm } from "@/features/relacionamento/configuracao-calendario-form";
import { DatasComemorativasPanel } from "@/features/relacionamento/datas-comemorativas-panel";
import { CampanhasSaudePanel } from "@/features/relacionamento/campanhas-saude-panel";
import { DesfechoPrazoForm } from "@/features/desfecho-judicial/desfecho-prazo-form";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function ConfiguracoesRelacionamentoPage() {
  const supabase = await createClient();
  const [
    { data: regrasDb, error: erroRegras },
    { data: configDb, error: erroConfig },
    { data: datasDb, error: erroDatas },
    { data: campanhasDb, error: erroCampanhas },
  ] = await Promise.all([
    supabase.from("continuidade_regras").select("*").order("servico_origem", { ascending: true }),
    supabase.from("relacionamento_configuracoes").select("*").eq("id", true).maybeSingle(),
    supabase.from("datas_comemorativas_profissionais").select("*").order("profissao", { ascending: true }),
    supabase.from("campanhas_tematicas_saude").select("*").order("nome", { ascending: true }),
  ]);
  for (const [rotulo, erro] of [
    ["regras de continuidade", erroRegras],
    ["configurações", erroConfig],
    ["datas comemorativas", erroDatas],
    ["campanhas de saúde", erroCampanhas],
  ] as const) {
    if (erro) console.error(`Configurações de Relacionamento: falha ao buscar ${rotulo}:`, erro.message);
  }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/relacionamento" className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← Voltar
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Configurações de Relacionamento</h1>
      </div>
      {(erroRegras || erroConfig || erroDatas || erroCampanhas) && <BannerErroConsulta mensagem="Não consegui carregar todas as configurações agora." />}
      <RegrasPanel regras={regrasDb ?? []} />
      <ConfiguracaoCreditoForm valorAtual={configDb?.valor_credito_indicacao_padrao ?? 0} />
      <ConfiguracaoCalendarioForm
        prazoMeses={configDb?.prazo_meses_atualizacao_cliente_saude ?? 6}
        diasAntecedencia={configDb?.dias_antecedencia_aniversarios ?? 15}
      />
      <DatasComemorativasPanel datas={datasDb ?? []} />
      <CampanhasSaudePanel campanhas={campanhasDb ?? []} />
      <DesfechoPrazoForm prazoDias={configDb?.prazo_dias_desfecho_judicial_pendente ?? 90} />
    </main>
  );
}
