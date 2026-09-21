"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarIncapacidade } from "./actions";
import { PARCIAL_TOTAL_ROTULOS, INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { CasoIncapacidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Incapacidade (§18) — exibida só quando pertinente ao caso. */
export function IncapacidadePanel({ incapacidade, processoId }: { incapacidade: CasoIncapacidadeRow; processoId: string }) {
  const router = useRouter();
  const [pertinente, setPertinente] = useState(incapacidade.pertinente);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarIncapacidade(formData);
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Salvo." });
      router.refresh();
    });
  }

  return (
    <form
      action={salvar}
      className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4"
    >
      <input type="hidden" name="incapacidade_id" value={incapacidade.id} />
      <input type="hidden" name="processo_id" value={processoId} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Incapacidade</h2>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input
            type="checkbox"
            name="pertinente"
            checked={pertinente}
            onChange={(e) => setPertinente(e.target.checked)}
            className="accent-petroleo-600"
          />
          §18 — pertinente a este caso?
        </label>
      </div>

      {pertinente && (
        <div className="space-y-3 border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Profissão</label>
              <input name="profissao" defaultValue={incapacidade.profissao ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Atividade habitual</label>
              <input name="atividade_habitual" defaultValue={incapacidade.atividade_habitual ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Exigências funcionais</label>
            <textarea name="exigencias_funcionais" rows={2} defaultValue={incapacidade.exigencias_funcionais ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Limitações</label>
            <textarea name="limitacoes" rows={2} defaultValue={incapacidade.limitacoes ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Incapacidade atual</label>
            <textarea name="incapacidade_atual" rows={2} defaultValue={incapacidade.incapacidade_atual ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Parcial/total</label>
              <select name="parcial_total" defaultValue={incapacidade.parcial_total ?? ""} className={inputClass}>
                <option value="">— Não classificado —</option>
                {(Object.keys(PARCIAL_TOTAL_ROTULOS) as (keyof typeof PARCIAL_TOTAL_ROTULOS)[]).map((p) => (
                  <option key={p} value={p}>
                    {PARCIAL_TOTAL_ROTULOS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Temporária/permanente</label>
              <select name="temporaria_permanente" defaultValue={incapacidade.temporaria_permanente ?? ""} className={inputClass}>
                <option value="">— Não classificado —</option>
                {(Object.keys(INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS) as (keyof typeof INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS)[]).map((t) => (
                  <option key={t} value={t}>
                    {INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Reabilitação</label>
            <textarea name="reabilitacao" rows={2} defaultValue={incapacidade.reabilitacao ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data provável de início</label>
              <input type="date" name="data_provavel_inicio" defaultValue={incapacidade.data_provavel_inicio ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Prognóstico</label>
              <input name="prognostico" defaultValue={incapacidade.prognostico ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Necessidade de avaliação complementar</label>
            <textarea
              name="necessidade_avaliacao_complementar"
              rows={2}
              defaultValue={incapacidade.necessidade_avaliacao_complementar ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar
        </Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
