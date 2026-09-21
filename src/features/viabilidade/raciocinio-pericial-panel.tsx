"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRaciocinioPericial } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Provável raciocínio pericial em eventual judicialização (§25) — hub,
 * campo único, INTEIRAMENTE INTERNO. Nunca aparece automaticamente no PDF
 * externo (salvo reformulado/validado — decisão de código na fatia 8, não
 * convenção de tela).
 */
export function RaciocinioPericialPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarRaciocinioPericial(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Provável raciocínio pericial</h2>
        <p className="text-xs text-ambar-600 dark:text-ambar-400 mt-0.5">
          §25 — interno, nunca aparece no laudo/PDF entregue. Uso exclusivo de bastidor.
        </p>
      </div>

      <div>
        <label htmlFor="raciocinio_pericial_interno" className={labelClass}>
          Elementos provavelmente valorizados, documentos determinantes, hipóteses alternativas, fragilidades, questões
          centrais, tendência técnica provável, pontos a conduzir por futuros quesitos
        </label>
        <textarea
          id="raciocinio_pericial_interno"
          name="raciocinio_pericial_interno"
          rows={5}
          defaultValue={analise.raciocinio_pericial_interno ?? ""}
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
