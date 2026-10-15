"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarEntregaEtapaAt, type EtapaComEntrega } from "./etapa-at-actions";
import { MEIO_ENTREGA_ROTULOS, MEIOS_ENTREGA_ORDENADOS } from "@/features/quesitos-documento/catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import type { MeioEntrega } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** "YYYY-MM-DD" de hoje no fuso do navegador — só o valor inicial do campo, ela ajusta se entregou em outro dia. */
function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Registro de entrega das etapas Quesitos e Réplica (lote 15/10/2026, pedido
 * dela: "depois que eu entregar tem que notificar com a data da entrega,
 * meio de entrega (whatsapp, e-mail, sistema) ... que aí fica tudo
 * redondinho"). Vira o selo verde na lista de etapas contratadas e tira o
 * prazo da Central de Prazos.
 */
export function EntregaEtapaAtPanel({
  etapa,
  registroId,
  processoId,
  entregueEm,
  entregueVia,
}: {
  etapa: EtapaComEntrega;
  registroId: string;
  processoId: string;
  entregueEm: string | null;
  entregueVia: MeioEntrega | null;
}) {
  const router = useRouter();
  const [data, setData] = useState(() => hojeLocal());
  const [via, setVia] = useState<MeioEntrega | "">("");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function registrar(desfazer: boolean) {
    setMensagem(null);
    if (!desfazer && !via) {
      setMensagem({ tipo: "erro", texto: "Escolha o meio de entrega." });
      return;
    }
    startTransition(async () => {
      const r = await registrarEntregaEtapaAt({
        etapa,
        registroId,
        processoId,
        entregueEm: desfazer ? null : data,
        via: desfazer ? null : (via as MeioEntrega),
      });
      if ("error" in r) {
        setMensagem({ tipo: "erro", texto: r.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: desfazer ? "Registro de entrega desfeito." : "Entrega registrada." });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Entrega</h2>

      {entregueEm ? (
        <div className="flex flex-wrap items-center gap-3">
          <Selo variante="sucesso">
            Entregue em {dataCurta(entregueEm)}
            {entregueVia ? ` · ${MEIO_ENTREGA_ROTULOS[entregueVia]}` : ""}
          </Selo>
          <Botao variante="secundaria" onClick={() => registrar(true)} carregando={isPending} textoCarregando="Salvando…">
            Desfazer registro
          </Botao>
        </div>
      ) : (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Registre quando enviar o documento ao advogado.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${etapa}_entregue_em`} className={labelClass}>
                Data da entrega
              </label>
              <input id={`${etapa}_entregue_em`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
            </div>
            <div>
              <span className={labelClass}>Meio de entrega</span>
              <div className="flex flex-wrap gap-2">
                {MEIOS_ENTREGA_ORDENADOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setVia(m)}
                    aria-pressed={via === m}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      via === m
                        ? "border-petroleo-500 bg-petroleo-100 text-petroleo-700 dark:border-petroleo-400 dark:bg-petroleo-950 dark:text-petroleo-300"
                        : "border-nevoa-300 text-nevoa-700 hover:bg-nevoa-100 dark:border-nevoa-700 dark:text-nevoa-300 dark:hover:bg-nevoa-800"
                    }`}
                  >
                    {MEIO_ENTREGA_ROTULOS[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Botao onClick={() => registrar(false)} carregando={isPending} textoCarregando="Registrando…">
            Registrar entrega
          </Botao>
        </>
      )}

      {mensagem?.tipo === "erro" && <p className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</p>}
      {mensagem?.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
