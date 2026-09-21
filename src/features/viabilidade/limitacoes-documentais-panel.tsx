"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarLimitacoesDocumentais } from "./actions";
import { LIMITACOES_DOCUMENTAIS_OPCOES, IMPACTO_LIMITACAO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Limitações documentais (§10) — hub, não repetível. Justificativa NÃO é
 * exigida aqui (a trava real depende da conclusão, que só existe na fatia
 * 7 — ver comentário de `salvarLimitacoesDocumentais`), mas o campo já
 * fica disponível pra quando ela quiser preencher desde já.
 */
export function LimitacoesDocumentaisPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarLimitacoesDocumentais(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Limitações documentais</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-3">Marque tudo que se aplica ao acervo desta análise.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {LIMITACOES_DOCUMENTAIS_OPCOES.map((op) => (
            <label key={op.valor} className="flex items-start gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
              <input
                type="checkbox"
                name="limitacoes_documentais"
                value={op.valor}
                defaultChecked={(analise.limitacoes_documentais ?? []).includes(op.valor)}
                className="mt-0.5 accent-petroleo-600"
              />
              {op.rotulo}
            </label>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="limitacoes_impacto" className={labelClass}>
          Impacto
        </label>
        <select id="limitacoes_impacto" name="limitacoes_impacto" defaultValue={analise.limitacoes_impacto ?? ""} className={inputClass}>
          <option value="">— Não classificado —</option>
          {(Object.keys(IMPACTO_LIMITACAO_ROTULOS) as (keyof typeof IMPACTO_LIMITACAO_ROTULOS)[]).map((i) => (
            <option key={i} value={i}>
              {IMPACTO_LIMITACAO_ROTULOS[i]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="limitacoes_justificativa" className={labelClass}>
          Justificativa
        </label>
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">
          Obrigatória quando o impacto for &ldquo;Impede conclusão&rdquo; e a conclusão da análise (fatia seguinte) for definitiva.
        </p>
        <textarea
          id="limitacoes_justificativa"
          name="limitacoes_justificativa"
          rows={3}
          defaultValue={analise.limitacoes_justificativa ?? ""}
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
