"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRelatorioTecnico } from "./actions";
import {
  DOCUMENTACAO_SUFICIENTE_ROTULOS,
  DOCUMENTACAO_SUFICIENTE_ORDENADAS,
  DOCUMENTACAO_SUFICIENTE_TEXTOS_PADRAO,
  QUESTAO_TECNICA_TEXTOS_PADRAO,
  CAMPO_COMPLEMENTAR_ROTULOS,
  CAMPOS_COMPLEMENTARES_ORDENADOS,
  CAMPO_COMPLEMENTAR_TEXTOS_PADRAO,
  CONCLUSAO_TEXTOS_PADRAO,
  DOCUMENTOS_COMPLEMENTARES_TEXTOS_PADRAO,
} from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { RelatoriosTecnicosRow } from "@/types/database";
import type { RelatorioTecnicoDocumentacaoSuficiente } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";
const botaoModeloClass =
  "text-xs text-petroleo-600 hover:underline dark:text-petroleo-400 text-left";

function appendTexto(atual: string, novo: string): string {
  return atual.trim() ? `${atual}\n${novo}` : novo;
}

export function RelatorioTecnicoPanel({
  relatorio,
  documentosDisponiveis,
}: {
  relatorio: RelatoriosTecnicosRow;
  documentosDisponiveis: { id: string; nomeArquivo: string }[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [questaoTecnica, setQuestaoTecnica] = useState(relatorio.questao_tecnica_principal ?? "");
  const [docsSuficiente, setDocsSuficiente] = useState<RelatorioTecnicoDocumentacaoSuficiente | "">(
    relatorio.documentacao_suficiente ?? "",
  );
  const [docsSuficienteDetalhe, setDocsSuficienteDetalhe] = useState(relatorio.documentacao_suficiente_detalhe ?? "");
  const [camposComplementares, setCamposComplementares] = useState<Set<string>>(new Set(relatorio.campos_complementares));
  const [camposTexto, setCamposTexto] = useState<Record<string, string>>({
    campo_diagnostico_cid: relatorio.campo_diagnostico_cid ?? "",
    campo_conduta: relatorio.campo_conduta ?? "",
    campo_nexo_causal: relatorio.campo_nexo_causal ?? "",
    campo_dano: relatorio.campo_dano ?? "",
    campo_incapacidade: relatorio.campo_incapacidade ?? "",
    campo_tratamento: relatorio.campo_tratamento ?? "",
    campo_prognostico: relatorio.campo_prognostico ?? "",
  });
  const [conclusao, setConclusao] = useState(relatorio.conclusao ?? "");
  const [documentosComplementaresTexto, setDocumentosComplementaresTexto] = useState(
    relatorio.documentos_complementares_texto ?? "",
  );

  function alternarCampoComplementar(campo: string) {
    setCamposComplementares((atual) => {
      const novo = new Set(atual);
      if (novo.has(campo)) novo.delete(campo);
      else novo.add(campo);
      return novo;
    });
  }

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarRelatorioTecnico(formData);
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Salvo." });
      router.refresh();
    });
  }

  return (
    <form action={salvar} className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-5">
      <input type="hidden" name="id" value={relatorio.id} />
      <input type="hidden" name="processo_id" value={relatorio.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">I — Objeto do Relatório</h2>
      </div>
      <div>
        <label htmlFor="solicitante" className={labelClass}>Solicitante</label>
        <input id="solicitante" name="solicitante" defaultValue={relatorio.solicitante ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="objeto_relatorio" className={labelClass}>Objeto do relatório</label>
        <textarea id="objeto_relatorio" name="objeto_relatorio" rows={2} defaultValue={relatorio.objeto_relatorio ?? ""} className={inputClass} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="questao_tecnica_principal" className={labelClass}>Questão técnica principal</label>
        </div>
        <textarea
          id="questao_tecnica_principal"
          name="questao_tecnica_principal"
          rows={2}
          value={questaoTecnica}
          onChange={(e) => setQuestaoTecnica(e.target.value)}
          className={inputClass}
        />
        <div className="flex flex-col gap-1 mt-1">
          {QUESTAO_TECNICA_TEXTOS_PADRAO.map((texto) => (
            <button key={texto} type="button" className={botaoModeloClass} onClick={() => setQuestaoTecnica(appendTexto(questaoTecnica, texto))}>
              + {texto}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">II — Documentos Analisados</h2>
      </div>
      <div>
        <label className={labelClass}>Documentos considerados</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1 max-h-40 overflow-y-auto">
          {documentosDisponiveis.length === 0 ? (
            <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum documento anexado a este processo ainda.</p>
          ) : (
            documentosDisponiveis.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
                <input type="checkbox" name="documentos_referenciados" value={d.id} defaultChecked={relatorio.documentos_referenciados.includes(d.id)} />
                {d.nomeArquivo}
              </label>
            ))
          )}
        </div>
      </div>
      <div>
        <label htmlFor="documentacao_suficiente" className={labelClass}>Documentação considerada suficiente?</label>
        <select
          id="documentacao_suficiente"
          name="documentacao_suficiente"
          value={docsSuficiente}
          onChange={(e) => {
            const valor = e.target.value as RelatorioTecnicoDocumentacaoSuficiente | "";
            setDocsSuficiente(valor);
            if (valor) setDocsSuficienteDetalhe(DOCUMENTACAO_SUFICIENTE_TEXTOS_PADRAO[valor]);
          }}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          {DOCUMENTACAO_SUFICIENTE_ORDENADAS.map((v) => (
            <option key={v} value={v}>
              {DOCUMENTACAO_SUFICIENTE_ROTULOS[v]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="documentacao_suficiente_detalhe" className={labelClass}>Detalhe (editável)</label>
        <textarea
          id="documentacao_suficiente_detalhe"
          name="documentacao_suficiente_detalhe"
          rows={2}
          value={docsSuficienteDetalhe}
          onChange={(e) => setDocsSuficienteDetalhe(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">III — Síntese Técnica do Caso</h2>
      </div>
      <div>
        <textarea name="sintese_tecnica_caso" rows={3} defaultValue={relatorio.sintese_tecnica_caso ?? ""} className={inputClass} />
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">IV — Análise Técnica</h2>
      </div>
      <div>
        <textarea name="analise_tecnica" rows={3} defaultValue={relatorio.analise_tecnica ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Campos complementares (só entram no PDF se marcados e preenchidos)</label>
        <div className="space-y-3 mt-1">
          {CAMPOS_COMPLEMENTARES_ORDENADOS.map((campo) => (
            <div key={campo} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-3">
              <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300 mb-1.5">
                <input
                  type="checkbox"
                  name="campos_complementares"
                  value={campo}
                  checked={camposComplementares.has(campo)}
                  onChange={() => alternarCampoComplementar(campo)}
                />
                {CAMPO_COMPLEMENTAR_ROTULOS[campo]}
              </label>
              {camposComplementares.has(campo) && (
                <>
                  <textarea
                    name={campo}
                    rows={2}
                    value={camposTexto[campo]}
                    onChange={(e) => setCamposTexto((atual) => ({ ...atual, [campo]: e.target.value }))}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    className={`${botaoModeloClass} mt-1`}
                    onClick={() =>
                      setCamposTexto((atual) => ({
                        ...atual,
                        [campo]: appendTexto(atual[campo], CAMPO_COMPLEMENTAR_TEXTOS_PADRAO[campo]),
                      }))
                    }
                  >
                    + Inserir modelo padrão
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">V — Conclusão</h2>
      </div>
      <div>
        <textarea name="conclusao" rows={3} value={conclusao} onChange={(e) => setConclusao(e.target.value)} className={inputClass} />
        <div className="flex flex-col gap-1 mt-1">
          {CONCLUSAO_TEXTOS_PADRAO.map((c) => (
            <button key={c.rotulo} type="button" className={botaoModeloClass} onClick={() => setConclusao(appendTexto(conclusao, c.texto))}>
              + {c.rotulo}: {c.texto}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="documentos_complementares_texto" className={labelClass}>
          Documentos/providências complementares (opcional)
        </label>
        <textarea
          id="documentos_complementares_texto"
          name="documentos_complementares_texto"
          rows={2}
          value={documentosComplementaresTexto}
          onChange={(e) => setDocumentosComplementaresTexto(e.target.value)}
          className={inputClass}
        />
        <div className="flex flex-col gap-1 mt-1">
          {DOCUMENTOS_COMPLEMENTARES_TEXTOS_PADRAO.map((texto) => (
            <button
              key={texto}
              type="button"
              className={botaoModeloClass}
              onClick={() => setDocumentosComplementaresTexto(appendTexto(documentosComplementaresTexto, texto))}
            >
              + {texto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>Local de emissão</label>
          <input id="local_emissao" name="local_emissao" defaultValue={relatorio.local_emissao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_emissao" className={labelClass}>Data de emissão</label>
          <input id="data_emissao" name="data_emissao" type="date" defaultValue={relatorio.data_emissao ?? ""} className={inputClass} />
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
