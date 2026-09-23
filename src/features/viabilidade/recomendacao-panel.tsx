"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRecomendacao } from "./actions";
import { RECOMENDACAO_SEED } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Recomendação técnica (§30) — catálogo editável, os serviços já
 * existentes no sistema (EtapaContratada, menos a própria Análise de
 * Viabilidade) + opções que não são serviço, incluindo "Não recomendar
 * continuidade" (decisão do Jeferson, 21/09/2026: às vezes a
 * recomendação certa é não contratar nada). Justificativa obrigatória.
 */
export function RecomendacaoPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarRecomendacao(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Recomendação técnica</h2>
        <label htmlFor="recomendacao" className={labelClass}>
          §30 — qual providência é tecnicamente recomendada?
        </label>
        <ComboboxCatalogo
          id="recomendacao"
          name="recomendacao"
          sugestoes={[...RECOMENDACAO_SEED]}
          valorInicial={analise.recomendacao ?? ""}
          rotuloNovo="Outra recomendação"
        />
      </div>

      <div>
        <label htmlFor="recomendacao_justificativa" className={labelClass}>
          Justificativa {analise.recomendacao ? "(obrigatória)" : ""}
        </label>
        <textarea
          id="recomendacao_justificativa"
          name="recomendacao_justificativa"
          rows={3}
          defaultValue={analise.recomendacao_justificativa ?? ""}
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
