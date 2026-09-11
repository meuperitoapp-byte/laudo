import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import { conclusaoVigenteAtual } from "@/features/pos-laudo/consultas";
import { TIPO_DOCUMENTO_ROTULOS } from "@/features/pos-laudo/rotulos";
import type { LaudoGeradoTipo } from "@/types/enums";

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

/**
 * Linha do tempo de versões do processo (fatia 12) — TODAS as linhas de
 * `laudos_gerados` (o Laudo V1 e toda saída de pós-laudo, judicial ou AT),
 * em ordem cronológica (`versao` é monotônica por processo, nunca reusada —
 * é a própria ordem de criação). Só leitura: nenhuma ação mora aqui, gerar
 * e protocolar continuam na tela do ciclo/do laudo.
 *
 * Resolve o pedido do Jeferson: hoje não existe um lugar único pra ver tudo
 * que já saiu do processo sem abrir ciclo por ciclo (a tela do laudo final
 * filtra por tipo; as saídas do pós-laudo vivem dentro de cada ciclo).
 */
export default async function LinhaDoTempoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("id, numero_processo, periciando_nome, parte_autora")
    .eq("id", processoId)
    .single();
  if (!processo) {
    notFound();
  }

  const [{ data: versoesDb }, conclusaoVigente] = await Promise.all([
    supabase
      .from("laudos_gerados")
      .select("*")
      .eq("processo_id", processoId)
      .order("versao", { ascending: true }),
    conclusaoVigenteAtual(supabase, processoId),
  ]);
  const versoes = versoesDb ?? [];

  // Números de ciclo pros links "Ciclo N" — uma consulta só pros ciclos
  // efetivamente referenciados (o Laudo V1 não referencia nenhum).
  const idsCiclos = Array.from(
    new Set(versoes.map((v) => v.pos_laudo_ciclo_id).filter((id): id is string => Boolean(id))),
  );
  let numeroCicloPorId = new Map<string, number>();
  if (idsCiclos.length > 0) {
    const { data: ciclosDb } = await supabase
      .from("pos_laudo_ciclos")
      .select("id, numero_ciclo")
      .in("id", idsCiclos);
    numeroCicloPorId = new Map((ciclosDb ?? []).map((c) => [c.id, c.numero_ciclo]));
  }

  const docOrigemConclusao = conclusaoVigente
    ? versoes.find((v) => v.id === conclusaoVigente.origem_laudo_gerado_id)
    : null;

  const titulo =
    processo.numero_processo ||
    processo.periciando_nome ||
    processo.parte_autora ||
    "Processo sem identificação";

  const rotuloDocumento = (v: { tipo: string; titulo: string | null }) =>
    v.titulo || TIPO_DOCUMENTO_ROTULOS[v.tipo as LaudoGeradoTipo] || v.tipo;

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <Link
        href={`/processos/${processoId}/pos-laudo`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o pós-laudo
      </Link>
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">
          Linha do tempo
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">{titulo}</p>
      </div>

      {conclusaoVigente && (
        <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-50 dark:bg-nevoa-900/60 p-4 space-y-1">
          <span className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
            Conclusão vigente atual
          </span>
          <p className="whitespace-pre-wrap text-sm text-nevoa-800 dark:text-nevoa-200">
            {conclusaoVigente.texto}
          </p>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 pt-1">
            Vigente desde {dataCurta(conclusaoVigente.vigente_desde)}
            {docOrigemConclusao && (
              <>
                {" "}
                — a partir de{" "}
                <strong>
                  V{docOrigemConclusao.versao} — {rotuloDocumento(docOrigemConclusao)}
                </strong>
              </>
            )}
            .
          </p>
        </div>
      )}

      {versoes.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum documento gerado ainda.</p>
      ) : (
        <ol className="space-y-3">
          {versoes.map((v) => {
            const numeroCiclo = v.pos_laudo_ciclo_id ? numeroCicloPorId.get(v.pos_laudo_ciclo_id) : undefined;
            const ehConclusaoVigente = conclusaoVigente?.origem_laudo_gerado_id === v.id;

            return (
              <li
                key={v.id}
                className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-nevoa-900 dark:text-nevoa-100">Versão {v.versao}</span>
                  <span className="text-sm text-nevoa-600 dark:text-nevoa-300">{rotuloDocumento(v)}</span>
                  {ehConclusaoVigente && <Selo variante="sucesso">Conclusão vigente atual</Selo>}
                </div>

                <p className="text-xs text-nevoa-500 dark:text-nevoa-400">{dataHora(v.created_at)}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {v.protocolado ? (
                    <Selo variante="sucesso">
                      Protocolado{v.protocolado_em ? ` em ${dataCurta(v.protocolado_em)}` : ""}
                      {v.protocolo_id ? ` · nº ${v.protocolo_id}` : ""}
                    </Selo>
                  ) : v.entregue_ao_advogado_em ? (
                    <Selo variante="atencao">Entregue ao advogado em {dataCurta(v.entregue_ao_advogado_em)}</Selo>
                  ) : (
                    <Selo variante="neutro">Gerado</Selo>
                  )}

                  {v.pos_laudo_ciclo_id ? (
                    numeroCiclo !== undefined ? (
                      <Link
                        href={`/processos/${processoId}/pos-laudo/${v.pos_laudo_ciclo_id}`}
                        className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                      >
                        Ciclo {numeroCiclo}
                      </Link>
                    ) : (
                      <span className="text-nevoa-400 dark:text-nevoa-600">Ciclo removido</span>
                    )
                  ) : v.tipo === "aceite_pericial" || v.tipo === "dados_deposito" || v.tipo === "agendamento_pericia" ? (
                    <Link
                      href={`/processos/${processoId}/fluxo-principal`}
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      Fluxo Principal
                    </Link>
                  ) : (
                    <Link
                      href={`/processos/${processoId}/laudo`}
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      Laudo original
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
