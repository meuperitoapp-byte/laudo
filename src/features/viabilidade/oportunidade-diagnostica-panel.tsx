"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarOportunidadeDiagnostica } from "./actions";
import { OPORTUNIDADE_DIAGNOSTICA_ROTULOS, HOUVE_ATRASO_ROTULOS, GRAU_SEGURANCA_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";
import type { ViabilidadeOportunidadeDiagnostica } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Oportunidade diagnóstica ou terapêutica (§15) — os campos detalhados só fazem sentido quando a resposta é "Sim", por isso ficam ocultos até lá (diferente do caso de Documentos faltantes: aqui o conteúdo em si não existe fora do "Sim"). */
export function OportunidadeDiagnosticaPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [resposta, setResposta] = useState<ViabilidadeOportunidadeDiagnostica | "">(analise.oportunidade_diagnostica ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarOportunidadeDiagnostica(formData);
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
      <input type="hidden" name="analise_id" value={analise.id} />
      <input type="hidden" name="processo_id" value={analise.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">
          Oportunidade diagnóstica ou terapêutica
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-3">§15 — houve oportunidade relevante de diagnóstico/intervenção?</p>
        <select
          name="oportunidade_diagnostica"
          value={resposta}
          onChange={(e) => setResposta(e.target.value as ViabilidadeOportunidadeDiagnostica | "")}
          className={`${inputClass} max-w-xs`}
        >
          <option value="">— Ainda não respondido —</option>
          {(Object.keys(OPORTUNIDADE_DIAGNOSTICA_ROTULOS) as (keyof typeof OPORTUNIDADE_DIAGNOSTICA_ROTULOS)[]).map((o) => (
            <option key={o} value={o}>
              {OPORTUNIDADE_DIAGNOSTICA_ROTULOS[o]}
            </option>
          ))}
        </select>
      </div>

      {resposta === "sim" && (
        <div className="space-y-3 border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          <div>
            <label className={labelClass}>Momento</label>
            <input name="oportunidade_momento" defaultValue={analise.oportunidade_momento ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sinais</label>
            <textarea name="oportunidade_sinais" rows={2} defaultValue={analise.oportunidade_sinais ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Exames</label>
            <textarea name="oportunidade_exames" rows={2} defaultValue={analise.oportunidade_exames ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Conduta possível</label>
              <textarea name="oportunidade_conduta_possivel" rows={2} defaultValue={analise.oportunidade_conduta_possivel ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Conduta realizada</label>
              <textarea name="oportunidade_conduta_realizada" rows={2} defaultValue={analise.oportunidade_conduta_realizada ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Houve atraso?</label>
              <select name="oportunidade_houve_atraso" defaultValue={analise.oportunidade_houve_atraso ?? ""} className={inputClass}>
                <option value="">— Não respondido —</option>
                {(Object.keys(HOUVE_ATRASO_ROTULOS) as (keyof typeof HOUVE_ATRASO_ROTULOS)[]).map((h) => (
                  <option key={h} value={h}>
                    {HOUVE_ATRASO_ROTULOS[h]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Duração estimada</label>
              <input name="oportunidade_duracao_estimada" defaultValue={analise.oportunidade_duracao_estimada ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Grau de segurança</label>
              <select name="oportunidade_grau_seguranca" defaultValue={analise.oportunidade_grau_seguranca ?? ""} className={inputClass}>
                <option value="">— Não classificado —</option>
                {(Object.keys(GRAU_SEGURANCA_ROTULOS) as (keyof typeof GRAU_SEGURANCA_ROTULOS)[]).map((g) => (
                  <option key={g} value={g}>
                    {GRAU_SEGURANCA_ROTULOS[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Repercussão</label>
            <textarea name="oportunidade_repercussao" rows={2} defaultValue={analise.oportunidade_repercussao ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Evidências</label>
            <textarea name="oportunidade_evidencias" rows={2} defaultValue={analise.oportunidade_evidencias ?? ""} className={inputClass} />
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
