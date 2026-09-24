"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAtestado } from "./actions";
import {
  TITULO_TIPO_DOCUMENTO,
  FINALIDADES_ORDENADAS,
  FINALIDADE_ROTULOS,
  CONCLUSAO_MODELO_ROTULOS,
  CONCLUSAO_MODELO_TEXTOS,
  CC_OPCOES,
  CC_ROTULOS,
  CC_TEXTO_MODELOS,
} from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AtestadosRow } from "@/types/database";
import type { AtestadoFinalidade, AtestadoConclusaoModelo } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

export interface DocumentoParaAtestado {
  id: string;
  nomeArquivo: string;
}

/**
 * Preenchimento do Atestado/Declaração médico-pericial —
 * MODELO_PADRAO_ATESTADO_MEDICO_PERICIAL_PERICONS.pdf. Um "Salvar" só (não
 * salvar-por-seção): muitos campos condicionais, mais simples de raciocinar
 * com um envio de formulário só. Botões "usar modelo" inserem o texto
 * padrão do PDF na textarea, sempre editável depois — nunca aplicado
 * automaticamente sem a perita ver.
 */
export function AtestadoPanel({
  atestado,
  periciandoNome,
  documentosDisponiveis,
}: {
  atestado: AtestadosRow;
  periciandoNome: string;
  documentosDisponiveis: DocumentoParaAtestado[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [finalidades, setFinalidades] = useState<Set<AtestadoFinalidade>>(new Set(atestado.finalidades as AtestadoFinalidade[]));
  const [conclusaoTexto, setConclusaoTexto] = useState(atestado.conclusao_texto ?? "");
  const [conclusaoModelo, setConclusaoModelo] = useState(atestado.conclusao_modelo ?? "");
  const [capacidadeCivilTexto, setCapacidadeCivilTexto] = useState(atestado.capacidade_civil_texto ?? "");

  const mostrarCapacidadeCivil = finalidades.has("capacidade_civil");
  const mostrarOutraDescricao = finalidades.has("outra");

  function alternarFinalidade(f: AtestadoFinalidade) {
    setFinalidades((atual) => {
      const novo = new Set(atual);
      if (novo.has(f)) novo.delete(f);
      else novo.add(f);
      return novo;
    });
  }

  function usarModeloConclusao(modelo: AtestadoConclusaoModelo) {
    setConclusaoModelo(modelo);
    setConclusaoTexto(CONCLUSAO_MODELO_TEXTOS[modelo](periciandoNome));
  }

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarAtestado(formData);
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
      className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-6"
    >
      <input type="hidden" name="atestado_id" value={atestado.id} />
      <input type="hidden" name="processo_id" value={atestado.processo_id} />

      <div>
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">
          {TITULO_TIPO_DOCUMENTO[atestado.tipo_documento]}
        </h2>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Preencha os campos abaixo — nada é emitido sozinho, sempre revise antes de gerar o documento.</p>
      </div>

      {/* Finalidade */}
      <div>
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">Finalidade</h3>
        <div className="grid grid-cols-2 gap-2">
          {FINALIDADES_ORDENADAS.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
              <input
                type="checkbox"
                name="finalidades"
                value={f}
                checked={finalidades.has(f)}
                onChange={() => alternarFinalidade(f)}
                className="accent-petroleo-600"
              />
              {FINALIDADE_ROTULOS[f]}
            </label>
          ))}
        </div>
        {mostrarOutraDescricao && (
          <div className="mt-2">
            <label htmlFor="finalidade_outra_descricao" className={labelClass}>
              Descreva a finalidade
            </label>
            <input
              id="finalidade_outra_descricao"
              name="finalidade_outra_descricao"
              defaultValue={atestado.finalidade_outra_descricao ?? ""}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Elementos médicos analisados */}
      <div>
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">Elementos médicos analisados</h3>
        {documentosDisponiveis.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum documento anexado ao processo ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {documentosDisponiveis.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
                <input
                  type="checkbox"
                  name="documentos_referenciados"
                  value={d.id}
                  defaultChecked={atestado.documentos_referenciados.includes(d.id)}
                  className="accent-petroleo-600"
                />
                {d.nomeArquivo}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Condição médica */}
      <div className="space-y-3">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Condição médica</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="data_avaliacao" className={labelClass}>Data da avaliação</label>
            <input id="data_avaliacao" name="data_avaliacao" type="date" defaultValue={atestado.data_avaliacao ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cid" className={labelClass}>CID</label>
            <input id="cid" name="cid" defaultValue={atestado.cid ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="diagnostico" className={labelClass}>Diagnóstico</label>
          <input id="diagnostico" name="diagnostico" defaultValue={atestado.diagnostico ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="condicao_atual" className={labelClass}>Condição atual</label>
          <textarea id="condicao_atual" name="condicao_atual" rows={2} defaultValue={atestado.condicao_atual ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="repercussao_funcional" className={labelClass}>Repercussão funcional relevante</label>
          <textarea id="repercussao_funcional" name="repercussao_funcional" rows={2} defaultValue={atestado.repercussao_funcional ?? ""} className={inputClass} />
        </div>
      </div>

      {/* Conclusão médico-pericial */}
      <div>
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">Conclusão médico-pericial</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {(Object.keys(CONCLUSAO_MODELO_ROTULOS) as AtestadoConclusaoModelo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => usarModeloConclusao(m)}
              className="text-xs rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 text-nevoa-600 dark:text-nevoa-300 hover:bg-nevoa-50 dark:hover:bg-nevoa-800"
            >
              {CONCLUSAO_MODELO_ROTULOS[m]}
            </button>
          ))}
        </div>
        <input type="hidden" name="conclusao_modelo" value={conclusaoModelo} />
        <textarea
          name="conclusao_texto"
          value={conclusaoTexto}
          onChange={(e) => setConclusaoTexto(e.target.value)}
          rows={4}
          placeholder="Clique num modelo acima pra começar, ou escreva livremente."
          className={inputClass}
        />
      </div>

      {/* Capacidade civil — só quando a finalidade correspondente estiver marcada */}
      {mostrarCapacidadeCivil && (
        <div className="space-y-3 rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4">
          <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
            Capacidade civil / autonomia para atos da vida civil
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(CC_OPCOES) as (keyof typeof CC_OPCOES)[]).map((campo) => (
              <div key={campo}>
                <label htmlFor={campo} className={labelClass}>{CC_ROTULOS[campo]}</label>
                <select id={campo} name={campo} defaultValue={atestado[campo] ?? ""} className={inputClass}>
                  <option value="">— Não avaliado —</option>
                  {CC_OPCOES[campo].map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="cc_necessidade_terceiros" className={labelClass}>Necessidade de terceiros</label>
            <select id="cc_necessidade_terceiros" name="cc_necessidade_terceiros" defaultValue={atestado.cc_necessidade_terceiros ?? ""} className={inputClass}>
              <option value="">— Não respondido —</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
              <option value="parcial">Parcial</option>
            </select>
          </div>
          <div>
            <label htmlFor="capacidade_civil_texto" className={labelClass}>Conclusão sobre autonomia</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {CC_TEXTO_MODELOS.map((m) => (
                <button
                  key={m.rotulo}
                  type="button"
                  onClick={() => setCapacidadeCivilTexto(m.texto)}
                  className="text-xs rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2.5 py-1 text-nevoa-600 dark:text-nevoa-300 hover:bg-nevoa-50 dark:hover:bg-nevoa-800"
                >
                  {m.rotulo}
                </button>
              ))}
            </div>
            <textarea
              id="capacidade_civil_texto"
              name="capacidade_civil_texto"
              value={capacidadeCivilTexto}
              onChange={(e) => setCapacidadeCivilTexto(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Conclusão final */}
      <div className="space-y-3">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Conclusão final</h3>
        <textarea
          name="conclusao_final"
          rows={3}
          defaultValue={atestado.conclusao_final ?? ""}
          placeholder={`Diante dos elementos clínicos e médico-documentais avaliados, atesto que ${periciandoNome} apresenta [CONDIÇÃO], com repercussão sobre [FUNÇÃO], caracterizada por [CONCLUSÃO OBJETIVA].`}
          className={inputClass}
        />
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
            <input type="checkbox" name="complemento_condicao_na_data" defaultChecked={atestado.complemento_condicao_na_data} className="accent-petroleo-600" />
            A conclusão refere-se à condição identificada na data da avaliação.
          </label>
          <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
            <input type="checkbox" name="complemento_limitada_elementos" defaultChecked={atestado.complemento_limitada_elementos} className="accent-petroleo-600" />
            A conclusão encontra-se limitada aos elementos disponibilizados até a presente data.
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="complemento_reavaliacao_periodo" className="text-sm text-nevoa-700 dark:text-nevoa-300 shrink-0">
              Recomenda-se reavaliação em:
            </label>
            <input
              id="complemento_reavaliacao_periodo"
              name="complemento_reavaliacao_periodo"
              defaultValue={atestado.complemento_reavaliacao_periodo ?? ""}
              placeholder="Ex.: 90 dias"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Local, data e assinatura */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>Local</label>
          <input id="local_emissao" name="local_emissao" defaultValue={atestado.local_emissao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_emissao" className={labelClass}>Data de emissão</label>
          <input id="data_emissao" name="data_emissao" type="date" defaultValue={atestado.data_emissao ?? ""} className={inputClass} />
        </div>
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
