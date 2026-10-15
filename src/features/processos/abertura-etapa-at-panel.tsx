"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAberturaEtapaAt, type EtapaComEntrega } from "./etapa-at-actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Dados de abertura das etapas Quesitos e Réplica (lote 15/10/2026) — nº do
 * processo (o mesmo do cadastro), data da contratação e prazo de entrega. O
 * prazo vai pra Central de Prazos/Agenda até a entrega ser registrada. O
 * anexo do arquivo do advogado fica no painel logo abaixo (AnexoEtapaAtPanel).
 */
export function AberturaEtapaAtPanel({
  etapa,
  registroId,
  processoId,
  numeroProcesso,
  dataContratacao,
  prazoEntrega,
}: {
  etapa: EtapaComEntrega;
  registroId: string;
  processoId: string;
  numeroProcesso: string | null;
  dataContratacao: string | null;
  prazoEntrega: string | null;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const r = await salvarAberturaEtapaAt({
        etapa,
        registroId,
        processoId,
        numeroProcesso: (formData.get("numero_processo") as string | null) ?? null,
        dataContratacao: (formData.get("data_contratacao") as string | null) ?? null,
        prazoEntrega: (formData.get("prazo_entrega") as string | null) ?? null,
      });
      if ("error" in r) {
        setMensagem({ tipo: "erro", texto: r.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Dados salvos." });
      router.refresh();
    });
  }

  return (
    <form action={salvar} className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Dados do processo</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          O prazo de entrega aparece na Central de Prazos e na Agenda até você registrar a entrega (no fim desta tela).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor={`${etapa}_numero_processo`} className={labelClass}>
            Número do processo
          </label>
          <input id={`${etapa}_numero_processo`} name="numero_processo" defaultValue={numeroProcesso ?? ""} placeholder="0000000-00.0000.0.00.0000" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${etapa}_data_contratacao`} className={labelClass}>
            Data da contratação
          </label>
          <input id={`${etapa}_data_contratacao`} name="data_contratacao" type="date" defaultValue={dataContratacao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${etapa}_prazo_entrega`} className={labelClass}>
            Prazo de entrega
          </label>
          <input id={`${etapa}_prazo_entrega`} name="prazo_entrega" type="date" defaultValue={prazoEntrega ?? ""} className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-nevoa-400 dark:text-nevoa-600">O número do processo é o mesmo do cadastro do caso — alterar aqui atualiza lá também.</p>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar
        </Botao>
        {mensagem?.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>
      {mensagem?.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
