"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRiscoPericial } from "./actions";
import { RISCO_GRAU_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Risco pericial (§23) — hub, não repetível, campo INTEIRAMENTE INTERNO.
 * Nunca aparece no PDF entregue à cliente (a fatia 8 exclui explicitamente
 * estes campos na geração do documento final) — é um bloco de bastidor
 * pra Dra. Fernanda avaliar riscos antes de assumir o caso.
 */
export function RiscoPericialPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarRiscoPericial(formData);
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
      className="rounded-xl border border-ambar-400 dark:border-ambar-600 bg-ambar-100/50 dark:bg-ambar-950/20 p-6 space-y-4"
    >
      <input type="hidden" name="analise_id" value={analise.id} />
      <input type="hidden" name="processo_id" value={analise.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Risco pericial</h2>
        <p className="text-xs text-ambar-600 dark:text-ambar-400 mt-0.5">
          §23 — interno, nunca aparece no laudo/PDF entregue. Uso exclusivo de bastidor.
        </p>
      </div>

      <div>
        <label htmlFor="risco_principal_tecnico" className={labelClass}>
          Principal risco técnico
        </label>
        <textarea
          id="risco_principal_tecnico"
          name="risco_principal_tecnico"
          rows={2}
          defaultValue={analise.risco_principal_tecnico ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="risco_fato_desfavoravel" className={labelClass}>
          Fato desfavorável relevante
        </label>
        <textarea
          id="risco_fato_desfavoravel"
          name="risco_fato_desfavoravel"
          rows={2}
          defaultValue={analise.risco_fato_desfavoravel ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="risco_documento_prejudicial" className={labelClass}>
          Documento potencialmente prejudicial
        </label>
        <textarea
          id="risco_documento_prejudicial"
          name="risco_documento_prejudicial"
          rows={2}
          defaultValue={analise.risco_documento_prejudicial ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="risco_pergunta_dificil" className={labelClass}>
          Pergunta difícil esperada
        </label>
        <textarea
          id="risco_pergunta_dificil"
          name="risco_pergunta_dificil"
          rows={2}
          defaultValue={analise.risco_pergunta_dificil ?? ""}
          className={inputClass}
        />
      </div>

      <div className="max-w-xs">
        <label htmlFor="risco_grau" className={labelClass}>
          Grau de risco
        </label>
        <select id="risco_grau" name="risco_grau" defaultValue={analise.risco_grau ?? ""} className={inputClass}>
          <option value="">— Não classificado —</option>
          {(Object.keys(RISCO_GRAU_ROTULOS) as (keyof typeof RISCO_GRAU_ROTULOS)[]).map((r) => (
            <option key={r} value={r}>
              {RISCO_GRAU_ROTULOS[r]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="risco_fundamentacao" className={labelClass}>
          Fundamentação
        </label>
        <textarea
          id="risco_fundamentacao"
          name="risco_fundamentacao"
          rows={3}
          defaultValue={analise.risco_fundamentacao ?? ""}
          className={inputClass}
        />
      </div>

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
