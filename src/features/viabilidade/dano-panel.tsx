"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarDano } from "./actions";
import { DANO_EXISTE_ROTULOS, DANO_TEMPORARIO_PERMANENTE_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { CasoDanoRow } from "@/types/database";
import type { ViabilidadeDanoExiste } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Dano (§17) — SEMPRE separa existência do dano (`existe`) de atribuição causal (`atribuicao_causal`), nunca um campo só misturando os dois. */
export function DanoPanel({ dano, processoId }: { dano: CasoDanoRow; processoId: string }) {
  const router = useRouter();
  const [existe, setExiste] = useState<ViabilidadeDanoExiste | "">(dano.existe ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarDano(formData);
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
      <input type="hidden" name="dano_id" value={dano.id} />
      <input type="hidden" name="processo_id" value={processoId} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Dano</h2>
        <label className={labelClass}>§17 — existe dano documentado?</label>
        <select
          name="existe"
          value={existe}
          onChange={(e) => setExiste(e.target.value as ViabilidadeDanoExiste | "")}
          className={`${inputClass} max-w-xs`}
        >
          <option value="">— Não respondido —</option>
          {(Object.keys(DANO_EXISTE_ROTULOS) as (keyof typeof DANO_EXISTE_ROTULOS)[]).map((e) => (
            <option key={e} value={e}>
              {DANO_EXISTE_ROTULOS[e]}
            </option>
          ))}
        </select>
      </div>

      {existe === "sim" && (
        <div className="space-y-3 border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          <div>
            <label className={labelClass}>Natureza</label>
            <textarea name="natureza" rows={2} defaultValue={dano.natureza ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data de início</label>
              <input type="date" name="data_inicio" defaultValue={dano.data_inicio ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Temporário/permanente</label>
              <select name="temporario_permanente" defaultValue={dano.temporario_permanente ?? ""} className={inputClass}>
                <option value="">— Não classificado —</option>
                {(Object.keys(DANO_TEMPORARIO_PERMANENTE_ROTULOS) as (keyof typeof DANO_TEMPORARIO_PERMANENTE_ROTULOS)[]).map((t) => (
                  <option key={t} value={t}>
                    {DANO_TEMPORARIO_PERMANENTE_ROTULOS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Situação atual</label>
            <textarea name="situacao_atual" rows={2} defaultValue={dano.situacao_atual ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reversibilidade</label>
            <textarea name="reversibilidade" rows={2} defaultValue={dano.reversibilidade ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Repercussão funcional</label>
            <textarea name="repercussao_funcional" rows={2} defaultValue={dano.repercussao_funcional ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tratamentos</label>
              <textarea name="tratamentos" rows={2} defaultValue={dano.tratamentos ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Necessidade de terceiros</label>
              <textarea name="necessidade_terceiros" rows={2} defaultValue={dano.necessidade_terceiros ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Prognóstico</label>
            <textarea name="prognostico" rows={2} defaultValue={dano.prognostico ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Documentação</label>
            <textarea name="documentacao" rows={2} defaultValue={dano.documentacao ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Atribuição causal</label>
            <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">Sempre separada da existência do dano acima.</p>
            <textarea name="atribuicao_causal" rows={2} defaultValue={dano.atribuicao_causal ?? ""} className={inputClass} />
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
