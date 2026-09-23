"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarMatrizViabilidade } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const DIMENSOES: { campo: string; rotulo: string }[] = [
  { campo: "matriz_suporte_documental", rotulo: "Suporte documental" },
  { campo: "matriz_sustentacao_conduta", rotulo: "Sustentação da conduta questionada" },
  { campo: "matriz_nexo", rotulo: "Nexo" },
  { campo: "matriz_dano", rotulo: "Dano" },
  { campo: "matriz_fragilidades", rotulo: "Fragilidades" },
  { campo: "matriz_provas_faltantes", rotulo: "Provas faltantes" },
  { campo: "matriz_risco_pericial", rotulo: "Risco pericial" },
  { campo: "matriz_sustentacao_global", rotulo: "Sustentação técnica global" },
];

/**
 * Matriz final de viabilidade (§28) — hub, qualitativa. SEM score
 * numérico automático (decisão do spec, reforçada no plano): apoia, não
 * substitui o julgamento profissional da perita.
 */
export function MatrizPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarMatrizViabilidade(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Matriz final de viabilidade</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          §28 — sem score numérico automático. Apoia, não substitui o julgamento profissional.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DIMENSOES.map((d) => (
          <div key={d.campo}>
            <label htmlFor={d.campo} className={labelClass}>
              {d.rotulo}
            </label>
            <textarea
              id={d.campo}
              name={d.campo}
              rows={2}
              defaultValue={(analise[d.campo as keyof AnalisesViabilidadeRow] as string | null) ?? ""}
              className={inputClass}
            />
          </div>
        ))}
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
