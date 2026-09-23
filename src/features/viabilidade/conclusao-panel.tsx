"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarConclusaoViabilidade } from "./actions";
import { CONCLUSAO_ORDENADA, CONCLUSAO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";
import type { ViabilidadeConclusao } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Conclusão da viabilidade (§29) — classificação final obrigatória.
 * Fundamentação sempre exigida (validada na action); "Viabilidade
 * condicionada" abre o campo de condicionante/providência, também
 * exigido nesse caso (mesmo padrão "esconde até marcar" da fatia 4).
 */
export function ConclusaoPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [conclusao, setConclusao] = useState<ViabilidadeConclusao | "">(analise.conclusao ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarConclusaoViabilidade(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Conclusão da viabilidade</h2>
        <label htmlFor="conclusao" className={labelClass}>
          §29 — classificação final
        </label>
        <select
          id="conclusao"
          name="conclusao"
          value={conclusao}
          onChange={(e) => setConclusao(e.target.value as ViabilidadeConclusao | "")}
          className={`${inputClass} max-w-xs`}
        >
          <option value="">— Não respondido —</option>
          {CONCLUSAO_ORDENADA.map((c) => (
            <option key={c} value={c}>
              {CONCLUSAO_ROTULOS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="conclusao_fundamentacao" className={labelClass}>
          Fundamentação {conclusao ? "(obrigatória)" : ""}
        </label>
        <textarea
          id="conclusao_fundamentacao"
          name="conclusao_fundamentacao"
          rows={3}
          defaultValue={analise.conclusao_fundamentacao ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="conclusao_elementos_favoraveis" className={labelClass}>
            Principais elementos favoráveis
          </label>
          <textarea
            id="conclusao_elementos_favoraveis"
            name="conclusao_elementos_favoraveis"
            rows={2}
            defaultValue={analise.conclusao_elementos_favoraveis ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="conclusao_fragilidades" className={labelClass}>
            Principais fragilidades
          </label>
          <textarea
            id="conclusao_fragilidades"
            name="conclusao_fragilidades"
            rows={2}
            defaultValue={analise.conclusao_fragilidades ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {conclusao === "viabilidade_condicionada" && (
        <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          <label htmlFor="conclusao_condicionantes" className={labelClass}>
            Condicionante(s)/providência (obrigatório pra viabilidade condicionada)
          </label>
          <textarea
            id="conclusao_condicionantes"
            name="conclusao_condicionantes"
            rows={2}
            defaultValue={analise.conclusao_condicionantes ?? ""}
            className={inputClass}
          />
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
