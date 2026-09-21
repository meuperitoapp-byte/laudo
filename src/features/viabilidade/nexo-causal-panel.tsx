"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarNexoCausal } from "./actions";
import { CONCLUSAO_NEXO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { CasoNexoCausalRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Nexo causal (§16) — bloco condicional: pergunta primeiro se o caso
 * exige análise de nexo, e só então abre o resto. A conclusão NUNCA é
 * calculada automaticamente — é sempre a escolha manual dela no select,
 * nenhum código deste componente decide isso sozinho.
 */
export function NexoCausalPanel({ nexo, processoId }: { nexo: CasoNexoCausalRow; processoId: string }) {
  const router = useRouter();
  const [aplicavel, setAplicavel] = useState(nexo.aplicavel);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarNexoCausal(formData);
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
      <input type="hidden" name="nexo_id" value={nexo.id} />
      <input type="hidden" name="processo_id" value={processoId} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Nexo causal</h2>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input
            type="checkbox"
            name="aplicavel"
            checked={aplicavel}
            onChange={(e) => setAplicavel(e.target.checked)}
            className="accent-petroleo-600"
          />
          §16 — o caso exige análise de nexo?
        </label>
      </div>

      {aplicavel && (
        <div className="space-y-3 border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Conduta/evento</label>
              <textarea name="conduta_evento" rows={2} defaultValue={nexo.conduta_evento ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dano</label>
              <textarea name="dano" rows={2} defaultValue={nexo.dano ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Temporalidade</label>
              <textarea name="temporalidade" rows={2} defaultValue={nexo.temporalidade ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Topografia</label>
              <textarea name="topografia" rows={2} defaultValue={nexo.topografia ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Plausibilidade biológica</label>
              <textarea name="plausibilidade_biologica" rows={2} defaultValue={nexo.plausibilidade_biologica ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Compatibilidade fisiopatológica</label>
              <textarea name="compatibilidade_fisiopatologica" rows={2} defaultValue={nexo.compatibilidade_fisiopatologica ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Preexistências</label>
              <textarea name="preexistencias" rows={2} defaultValue={nexo.preexistencias ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Concausas</label>
              <textarea name="concausas" rows={2} defaultValue={nexo.concausas ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Causas alternativas (texto)</label>
            <textarea name="causas_alternativas_texto" rows={2} defaultValue={nexo.causas_alternativas_texto ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Intercorrências independentes</label>
            <textarea name="intercorrencias_independentes" rows={2} defaultValue={nexo.intercorrencias_independentes ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Evidências favoráveis</label>
              <textarea name="evidencias_favoraveis" rows={2} defaultValue={nexo.evidencias_favoraveis ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Evidências contrárias</label>
              <textarea name="evidencias_contrarias" rows={2} defaultValue={nexo.evidencias_contrarias ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Fundamentação</label>
            <textarea name="fundamentacao" rows={3} defaultValue={nexo.fundamentacao ?? ""} className={inputClass} />
          </div>
          <div className="max-w-xs">
            <label className={labelClass}>Conclusão</label>
            <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">Escolha manual — nunca calculada pelo sistema.</p>
            <select name="conclusao" defaultValue={nexo.conclusao ?? ""} className={inputClass}>
              <option value="">— Não concluído —</option>
              {(Object.keys(CONCLUSAO_NEXO_ROTULOS) as (keyof typeof CONCLUSAO_NEXO_ROTULOS)[]).map((c) => (
                <option key={c} value={c}>
                  {CONCLUSAO_NEXO_ROTULOS[c]}
                </option>
              ))}
            </select>
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
