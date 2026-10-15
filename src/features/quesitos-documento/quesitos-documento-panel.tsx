"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarQuesitosDocumento } from "./actions";
import { PARTE_ROTULOS, PARTES_ORDENADAS, apresentacaoPadrao } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { QuesitosDocumentosRow } from "@/types/database";
import type { QuesitoParteProcessual } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Campos do documento de Quesitos que não vêm da lista de perguntas.
 * Reorganizado em 15/10/2026 na MESMA ordem em que saem no documento (o
 * layout anterior tinha "Endereçamento" e "Pontos controvertidos" lado a
 * lado e os dois acabaram trocados no caso real dela — o campo de pontos
 * controvertidos saiu do modelo novo). Ver compilar-pdf.ts.
 */
export function QuesitosDocumentoPanel({
  documento,
  enderecamentoSugerido,
}: {
  documento: QuesitosDocumentosRow;
  enderecamentoSugerido: string | null;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parte, setParte] = useState<QuesitoParteProcessual | "">(documento.parte_selecionada ?? "");
  // Sem edição salva, a apresentação acompanha a parte escolhida.
  const [apresentacao, setApresentacao] = useState(documento.apresentacao_at ?? apresentacaoPadrao(documento.parte_selecionada));
  const [apresentacaoEditada, setApresentacaoEditada] = useState(Boolean(documento.apresentacao_at));

  function trocarParte(nova: QuesitoParteProcessual | "") {
    setParte(nova);
    if (!apresentacaoEditada) setApresentacao(apresentacaoPadrao(nova || null));
  }

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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Documento ao Juízo</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Na mesma ordem em que sai no PDF/Word: endereçamento, nº do processo, apresentação, resumo dos fatos e depois os quesitos.
        </p>
      </div>

      <div>
        <label htmlFor="parte_selecionada" className={labelClass}>
          Assistente técnico da parte
        </label>
        <select
          id="parte_selecionada"
          name="parte_selecionada"
          value={parte}
          onChange={(e) => trocarParte(e.target.value as QuesitoParteProcessual | "")}
          className={inputClass}
        >
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
          1. Endereçamento ao Juízo
        </label>
        <textarea
          id="endereco_juizo"
          name="endereco_juizo"
          rows={2}
          placeholder="Ex.: AO DOUTO JUÍZO DA 2ª VARA CÍVEL DA COMARCA DE CORONEL FABRICIANO/MG"
          defaultValue={documento.endereco_juizo ?? enderecamentoSugerido ?? ""}
          className={inputClass}
        />
        {!documento.endereco_juizo && enderecamentoSugerido && (
          <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mt-1">Sugerido a partir da vara/comarca do cadastro — confira antes de salvar.</p>
        )}
      </div>

      <div>
        <label htmlFor="apresentacao_at" className={labelClass}>
          2. Apresentação do Assistente Técnico
        </label>
        <textarea
          id="apresentacao_at"
          name="apresentacao_at"
          rows={4}
          value={apresentacao}
          onChange={(e) => {
            setApresentacao(e.target.value);
            setApresentacaoEditada(true);
          }}
          className={inputClass}
        />
        {apresentacaoEditada && (
          <button
            type="button"
            onClick={() => {
              setApresentacao(apresentacaoPadrao(parte || null));
              setApresentacaoEditada(false);
            }}
            className="text-xs text-petroleo-600 hover:underline dark:text-petroleo-400 mt-1"
          >
            Voltar ao texto padrão
          </button>
        )}
      </div>

      <div>
        <label htmlFor="resumo_fatos" className={labelClass}>
          3. Breve resumo dos fatos / contextualização técnico-pericial (opcional)
        </label>
        <textarea
          id="resumo_fatos"
          name="resumo_fatos"
          rows={5}
          placeholder="Ex.: A prova pericial tem como fundamento essencial esclarecer ao douto juízo se houve..."
          defaultValue={documento.resumo_fatos ?? ""}
          className={inputClass}
        />
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mt-1">Sai como &ldquo;I- BREVE CONTEXTUALIZAÇÃO TÉCNICO-PERICIAL&rdquo;. Em branco, a seção não aparece.</p>
      </div>

      <div>
        <label htmlFor="introducao_quesitos" className={labelClass}>
          4. Frase antes do primeiro quesito (opcional)
        </label>
        <input
          id="introducao_quesitos"
          name="introducao_quesitos"
          placeholder="Ex.: Queira o(a) Ilmo(a) Perito(a) esclarecer ao Juízo:"
          defaultValue={documento.introducao_quesitos ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>
            Local de emissão
          </label>
          <input id="local_emissao" name="local_emissao" placeholder="Fortaleza-CE" defaultValue={documento.local_emissao ?? ""} className={inputClass} />
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
