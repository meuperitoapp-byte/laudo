"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarQuesitosDocumento } from "./actions";
import { PARTE_ROTULOS, PARTES_ORDENADAS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { QuesitosDocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Campos do documento final de Quesitos que não vêm da lista de perguntas (essa continua em QuesitosPanel). */
export function QuesitosDocumentoPanel({ documento }: { documento: QuesitosDocumentosRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarQuesitosDocumento(formData);
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
      <input type="hidden" name="id" value={documento.id} />
      <input type="hidden" name="processo_id" value={documento.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Documento final</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Só os quesitos marcados &ldquo;Apresentar no documento final&rdquo; (acima) entram no PDF/Word.
        </p>
      </div>

      <div>
        <label htmlFor="parte_selecionada" className={labelClass}>
          Quesitos da
        </label>
        <select id="parte_selecionada" name="parte_selecionada" defaultValue={documento.parte_selecionada ?? ""} className={inputClass}>
          <option value="">Selecione…</option>
          {PARTES_ORDENADAS.map((p) => (
            <option key={p} value={p}>
              {PARTE_ROTULOS[p]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="endereco_juizo" className={labelClass}>
          Endereçamento ao Juízo (uma linha por linha do endereço)
        </label>
        <textarea
          id="endereco_juizo"
          name="endereco_juizo"
          rows={2}
          placeholder="Ex.: AO JUÍZO DA 3ª VARA CÍVEL DA COMARCA DE FORTALEZA - CE"
          defaultValue={documento.endereco_juizo ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="pontos_controvertidos" className={labelClass}>
          Pontos controvertidos do despacho saneador (opcional, um por linha)
        </label>
        <textarea
          id="pontos_controvertidos"
          name="pontos_controvertidos"
          rows={2}
          defaultValue={documento.pontos_controvertidos ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="sintese_tese" className={labelClass}>
          Breve síntese da tese
        </label>
        <textarea id="sintese_tese" name="sintese_tese" rows={3} defaultValue={documento.sintese_tese ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="o_que_demonstrar_pericia" className={labelClass}>
          O que precisa ser demonstrado em perícia
        </label>
        <textarea
          id="o_que_demonstrar_pericia"
          name="o_que_demonstrar_pericia"
          rows={3}
          defaultValue={documento.o_que_demonstrar_pericia ?? ""}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>
            Local de emissão
          </label>
          <input id="local_emissao" name="local_emissao" defaultValue={documento.local_emissao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_emissao" className={labelClass}>
            Data de emissão
          </label>
          <input id="data_emissao" name="data_emissao" type="date" defaultValue={documento.data_emissao ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar
        </Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
