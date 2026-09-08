"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { encerrarCiclo, reabrirCiclo } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

export interface ResumoSaida {
  nome: string;
  geradas: number;
  protocolada: { versao: number; protocoloId: string | null; protocoladoEm: string | null } | null;
}

/**
 * Encerramento da rodada do ciclo (fatia 8). Cada ciclo de pós-laudo pode
 * terminar produzindo 0, 1, 2 ou as 3 saídas — nunca se força ter as três
 * geradas antes de deixar encerrar (decisão da Dra., confirmada em áudio).
 * Encerrar é reversível (`Reabrir ciclo`); só protocolar é irreversível.
 */
export function EncerramentoCiclo({
  processoId,
  cicloId,
  numeroCiclo,
  encerrado,
  encerradoEm,
  resumo,
}: {
  processoId: string;
  cicloId: string;
  numeroCiclo: number;
  encerrado: boolean;
  encerradoEm: string | null;
  resumo: ResumoSaida[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function encerrar() {
    if (
      !window.confirm(
        `Encerrar o ciclo ${numeroCiclo}? Você poderá reabrir depois se precisar gerar mais algum documento.`,
      )
    ) {
      return;
    }
    setToast(null);
    startTransition(async () => {
      const r = await encerrarCiclo(cicloId, processoId);
      if ("error" in r) {
        setToast({ tipo: "erro", texto: r.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Ciclo ${numeroCiclo} encerrado.` });
      router.refresh();
    });
  }

  function reabrir() {
    setToast(null);
    startTransition(async () => {
      const r = await reabrirCiclo(cicloId, processoId);
      if ("error" in r) {
        setToast({ tipo: "erro", texto: r.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Ciclo ${numeroCiclo} reaberto.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Encerramento da rodada</h2>
        {encerrado && <Selo variante="sucesso">Encerrado{encerradoEm ? ` em ${dataCurta(encerradoEm)}` : ""}</Selo>}
      </div>

      <div>
        <span className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
          Documentos produzidos nesta rodada
        </span>
        <ul className="space-y-1 text-sm">
          {resumo.map((s) => (
            <li key={s.nome} className="flex flex-wrap items-center gap-2">
              <span className="text-nevoa-800 dark:text-nevoa-200">{s.nome}:</span>
              {s.geradas === 0 ? (
                <span className="text-nevoa-500 dark:text-nevoa-400">não gerado</span>
              ) : (
                <span className="text-nevoa-700 dark:text-nevoa-300">
                  {s.geradas} {s.geradas === 1 ? "versão gerada" : "versões geradas"}
                </span>
              )}
              {s.protocolada && (
                <Selo variante="sucesso">
                  Protocolado — V{s.protocolada.versao}
                  {s.protocolada.protocoladoEm ? ` · ${dataCurta(s.protocolada.protocoladoEm)}` : ""}
                  {s.protocolada.protocoloId ? ` · nº ${s.protocolada.protocoloId}` : ""}
                </Selo>
              )}
            </li>
          ))}
        </ul>
      </div>

      {encerrado ? (
        <div className="space-y-2">
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
            A rodada está encerrada. Enquanto estiver assim, não é possível gerar novos documentos — mas
            você ainda pode protocolar os que já foram gerados. Reabra se precisar produzir mais alguma
            saída.
          </p>
          <Botao variante="secundaria" onClick={reabrir} carregando={isPending} textoCarregando="Reabrindo…">
            Reabrir ciclo
          </Botao>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
            Encerre quando já tiver produzido tudo o que precisava para esta rodada. Não é preciso ter
            gerado as três saídas — só as que fizeram sentido.
          </p>
          <Botao onClick={encerrar} carregando={isPending} textoCarregando="Encerrando…">
            Encerrar ciclo
          </Botao>
        </div>
      )}

      {toast && <Toast tipo={toast.tipo} texto={toast.texto} onClose={() => setToast(null)} />}
    </div>
  );
}
