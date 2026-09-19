"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarNotaFiscal } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Nota fiscal — pedido da Dra. Fernanda ao ver o painel Financeiro
 * (19/09/2026): marcar se foi emitida e o número. Mesmo padrão de
 * estado-do-caso das outras ações rápidas do detalhe do processo
 * (ReuniaoEstrategiaPericialPanel/ProximoMarcoHonorariosPanel) — preenchido/
 * limpo manualmente, nunca inferido. Disponível pros dois tipos de trabalho
 * (Judicial e AT emitem nota fiscal igualmente).
 */
export function NotaFiscalPanel({
  processoId,
  emitida,
  numero,
}: {
  processoId: string;
  emitida: "sim" | "nao" | null;
  numero: string | null;
}) {
  const router = useRouter();
  const [formAberto, setFormAberto] = useState(emitida !== "sim");
  const [numeroInput, setNumeroInput] = useState(numero ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function marcarEmitida() {
    const valor = numeroInput.trim();
    if (!valor) {
      setMensagem({ tipo: "erro", texto: "Informe o número da nota fiscal." });
      return;
    }
    setIsPending(true);
    const r = await salvarNotaFiscal(processoId, "sim", valor);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Nota fiscal registrada." });
    setFormAberto(false);
    router.refresh();
  }

  async function marcarNaoEmitida() {
    setIsPending(true);
    const r = await salvarNotaFiscal(processoId, "nao", null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Marcado como não emitida." });
    setNumeroInput("");
    setFormAberto(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Nota fiscal</h3>

      {emitida === "sim" && !formAberto ? (
        <>
          <Selo variante="sucesso">Emitida — nº {numero}</Selo>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundaria" onClick={() => setFormAberto(true)}>
              Editar número
            </Botao>
            <Botao
              variante="secundaria"
              onClick={marcarNaoEmitida}
              disabled={isPending}
              carregando={isPending}
              textoCarregando="Salvando…"
            >
              Marcar como não emitida
            </Botao>
          </div>
        </>
      ) : (
        <>
          {emitida === "nao" && <Selo variante="neutro">Não emitida</Selo>}
          <div>
            <label htmlFor={`nota_fiscal_numero_${processoId}`} className={labelClass}>
              Número da nota fiscal
            </label>
            <input
              id={`nota_fiscal_numero_${processoId}`}
              value={numeroInput}
              onChange={(e) => setNumeroInput(e.target.value)}
              placeholder="Ex.: 1234"
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Botao onClick={marcarEmitida} disabled={isPending} carregando={isPending} textoCarregando="Salvando…">
              Marcar como emitida
            </Botao>
            {emitida !== "nao" && (
              <Botao variante="secundaria" onClick={marcarNaoEmitida} disabled={isPending}>
                Marcar como não emitida
              </Botao>
            )}
            {emitida === "sim" && (
              <button
                type="button"
                onClick={() => {
                  setFormAberto(false);
                  setNumeroInput(numero ?? "");
                }}
                className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
