import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import { AbrirCicloButton } from "@/features/pos-laudo/abrir-ciclo-button";
import {
  CICLO_STATUS_ROTULOS,
  FLUXO_ROTULOS,
  NATUREZA_ROTULOS,
  ORIGEM_ROTULOS,
} from "@/features/pos-laudo/rotulos";
import type {
  PosLaudoCicloStatus,
  PosLaudoFluxo,
  PosLaudoNatureza,
  PosLaudoOrigem,
} from "@/types/enums";

const dataCurta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—";

export default async function PosLaudoIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("id, tipo_trabalho, numero_processo, periciando_nome, parte_autora")
    .eq("id", processoId)
    .single();
  if (!processo) {
    notFound();
  }

  // Gate (defesa em profundidade — alguém pode digitar a URL direto).
  const { data: laudoProtocolado } = await supabase
    .from("laudos_gerados")
    .select("id")
    .eq("processo_id", processoId)
    .eq("tipo", "laudo")
    .eq("protocolado", true)
    .limit(1)
    .maybeSingle();
  if (!laudoProtocolado) {
    notFound();
  }

  const { data: ciclos } = await supabase
    .from("pos_laudo_ciclos")
    .select("*")
    .eq("processo_id", processoId)
    .order("numero_ciclo", { ascending: true });

  const titulo =
    processo.numero_processo ||
    processo.periciando_nome ||
    processo.parte_autora ||
    "Processo sem identificação";
  const fluxo = processo.tipo_trabalho === "assistencia_tecnica" ? "assistencia_tecnica" : "judicial";

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Pós-laudo</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          {titulo} · {FLUXO_ROTULOS[fluxo as PosLaudoFluxo]}
        </p>
      </div>

      {!ciclos || ciclos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          Nenhum ciclo de pós-laudo ainda. Abra um quando o processo receber manifestação, pedido de
          esclarecimento, documento novo ou determinação de complementação.
        </p>
      ) : (
        <ul className="space-y-3">
          {ciclos.map((c) => {
            const naturezas = ((c.natureza as string[] | null) ?? []).map(
              (n) => NATUREZA_ROTULOS[n as PosLaudoNatureza] ?? n,
            );
            return (
              <li
                key={c.id}
                className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4"
              >
                <Link
                  href={`/processos/${processoId}/pos-laudo/${c.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-medium text-petroleo-600 hover:underline dark:text-petroleo-400">
                    Ciclo {c.numero_ciclo}
                  </span>
                  <Selo variante={c.status === "encerrado" ? "sucesso" : "neutro"}>
                    {CICLO_STATUS_ROTULOS[c.status as PosLaudoCicloStatus] ?? c.status}
                  </Selo>
                </Link>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-nevoa-600 dark:text-nevoa-400">
                  <div>
                    <dt className="inline font-medium">Intimação: </dt>
                    <dd className="inline">{dataCurta(c.data_intimacao)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Prazo: </dt>
                    <dd className="inline">{dataCurta(c.prazo)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Origem: </dt>
                    <dd className="inline">
                      {c.origem ? (ORIGEM_ROTULOS[c.origem as PosLaudoOrigem] ?? c.origem) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Natureza: </dt>
                    <dd className="inline">{naturezas.length > 0 ? naturezas.join(", ") : "—"}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <AbrirCicloButton processoId={processoId} />
    </main>
  );
}
