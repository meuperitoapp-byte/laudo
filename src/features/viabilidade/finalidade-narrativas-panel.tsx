"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarFinalidadeNarrativasObjeto } from "./actions";
import { FINALIDADE_OPCOES } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Finalidade (§4) + Narrativas (§5) + Objeto (§6, exceto questões técnicas,
 * painel próprio) — fatia 1. Narrativas ficam SEPARADAS dos Fatos
 * comprovados (fatia 3, tabela própria) de propósito: essa separação é o
 * que garante "narrativa nunca vira fato automaticamente" (§5), sem
 * depender de disciplina de quem preenche.
 */
export function FinalidadeNarrativasPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarFinalidadeNarrativasObjeto(formData);
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
      className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-5"
    >
      <input type="hidden" name="analise_id" value={analise.id} />
      <input type="hidden" name="processo_id" value={analise.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Finalidade da análise</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-3">Marque tudo que se aplica.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {FINALIDADE_OPCOES.map((op) => (
            <label key={op.valor} className="flex items-start gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
              <input
                type="checkbox"
                name="finalidade"
                value={op.valor}
                defaultChecked={analise.finalidade.includes(op.valor)}
                className="mt-0.5 accent-petroleo-600"
              />
              {op.rotulo}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="pergunta_central_advogado" className={labelClass}>
          Pergunta central do advogado
        </label>
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">
          Sem essa pergunta preenchida, a análise não pode ser concluída (§42).
        </p>
        <textarea
          id="pergunta_central_advogado"
          name="pergunta_central_advogado"
          rows={3}
          defaultValue={analise.pergunta_central_advogado ?? ""}
          className={inputClass}
        />
      </div>

      <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Narrativas</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-3">
          Alegado, não comprovado — nunca vira fato sozinho. Fatos validados entram à parte, na seção &ldquo;Fatos
          comprovados&rdquo; (fatia seguinte).
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="narrativa_advogado" className={labelClass}>
              Narrativa do advogado
            </label>
            <textarea
              id="narrativa_advogado"
              name="narrativa_advogado"
              rows={3}
              defaultValue={analise.narrativa_advogado ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="narrativa_cliente" className={labelClass}>
              Narrativa do cliente/paciente (quando houver contato autorizado)
            </label>
            <textarea
              id="narrativa_cliente"
              name="narrativa_cliente"
              rows={3}
              defaultValue={analise.narrativa_cliente ?? ""}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tese_inicial_apresentada" className={labelClass}>
                Tese inicialmente apresentada
              </label>
              <textarea
                id="tese_inicial_apresentada"
                name="tese_inicial_apresentada"
                rows={2}
                defaultValue={analise.tese_inicial_apresentada ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="narrativa_fonte_informacao" className={labelClass}>
                Fonte da informação
              </label>
              <textarea
                id="narrativa_fonte_informacao"
                name="narrativa_fonte_informacao"
                rows={2}
                defaultValue={analise.narrativa_fonte_informacao ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
        <label htmlFor="objeto_analise" className={labelClass}>
          Objeto da análise
        </label>
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">
          Reutilizado em Estratégia/Quesitos/Parecer quando esses módulos existirem (§40).
        </p>
        <textarea
          id="objeto_analise"
          name="objeto_analise"
          rows={4}
          defaultValue={analise.objeto_analise ?? ""}
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
