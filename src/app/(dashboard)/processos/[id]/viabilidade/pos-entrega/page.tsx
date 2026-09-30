import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirAnaliseViabilidade } from "@/features/viabilidade/actions";
import { PosEntregaPanel } from "@/features/viabilidade/pos-entrega-panel";
import { PROXIMA_ACAO_ROTULOS, PRIORIDADE_ROTULOS } from "@/features/viabilidade/catalogos";
import { obterContextoAcesso } from "@/features/acessos/contexto";
import { ErroConsultaPagina } from "@/components/ui/erro-consulta";

/**
 * Pós-entrega e satisfação (§39) — separada da Análise de Viabilidade
 * principal (30/09/2026, pedido dela: "essa parte teria que ser outra
 * janela, fica muito lá embaixo depois de tudo que analisei"). É também a
 * ÚNICA tela da Análise que Patrícia/financeiro enxergam — o resto (tudo
 * que a Dra. Fernanda analisa/conclui) é sigiloso, eles só têm acesso ao
 * essencial do caso e ao comando da próxima ação (ver `viabilidade/page.tsx`,
 * que redireciona perfil restrito pra cá).
 *
 * Trava (pedido dela): pra perfil restrito, só libera preencher depois que
 * a próxima ação foi marcada — "eu marco a próxima ação, daí essa janela
 * fica liberada pra Patrícia preencher". Admin sempre vê tudo, mesmo sem
 * próxima ação marcada ainda.
 */
export default async function PosEntregaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const contexto = session?.user.email ? await obterContextoAcesso(supabase, session.user.email) : { tipo: "admin" as const };
  const restrito = contexto.tipo === "restrito";

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora")
    .eq("id", id)
    .maybeSingle();
  if (erroProcesso) {
    console.error("Pós-entrega: falha ao buscar processo:", erroProcesso.message);
    return <ErroConsultaPagina titulo="Não foi possível carregar esta tela agora" />;
  }
  if (!processo) notFound();

  const analiseResultado = await garantirAnaliseViabilidade(id);
  if ("error" in analiseResultado) {
    console.error("Pós-entrega: falha ao garantir análise:", analiseResultado.error);
    return <ErroConsultaPagina titulo="Não foi possível abrir esta tela" />;
  }
  const analise = analiseResultado.data;

  const nomeCaso = processo.periciando_nome || processo.parte_autora || "Processo sem identificação";
  const voltarHref = restrito ? "/processos" : `/processos/${id}/viabilidade`;
  const voltarRotulo = restrito ? "← Casos" : `← ${nomeCaso}`;

  const aguardandoProximaAcao = restrito && !analise.proxima_acao;

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={voltarHref}
          className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
        >
          {voltarRotulo}
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-1">
          Pós-entrega e satisfação
        </h1>
        {!restrito && <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">{nomeCaso}</p>}
      </div>

      {aguardandoProximaAcao ? (
        <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-2">
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
            Aguardando a Dra. Fernanda definir a próxima ação neste caso.
          </p>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-500">Volte aqui depois que ela avisar.</p>
        </div>
      ) : (
        <>
          {analise.proxima_acao && (
            <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-1.5">
              <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Próxima ação</h2>
              <p className="text-sm text-nevoa-800 dark:text-nevoa-200">{PROXIMA_ACAO_ROTULOS[analise.proxima_acao]}</p>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
                {[
                  analise.proxima_acao_responsavel ? `Responsável: ${analise.proxima_acao_responsavel}` : null,
                  analise.proxima_acao_prazo ? `Prazo: ${analise.proxima_acao_prazo.split("-").reverse().join("/")}` : null,
                  analise.proxima_acao_prioridade ? PRIORIDADE_ROTULOS[analise.proxima_acao_prioridade] : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {analise.proxima_acao_observacao && (
                <p className="text-sm text-nevoa-700 dark:text-nevoa-300 whitespace-pre-wrap pt-2 border-t border-nevoa-100 dark:border-nevoa-800 mt-2">
                  {analise.proxima_acao_observacao}
                </p>
              )}
            </div>
          )}

          <PosEntregaPanel analise={analise} />
        </>
      )}
    </main>
  );
}
