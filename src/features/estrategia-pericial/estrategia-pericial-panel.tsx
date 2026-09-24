"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarEstrategiaPericial } from "./actions";
import { PROXIMA_ACAO_ESTRATEGIA_ROTULOS, PROXIMAS_ACOES_ESTRATEGIA_ORDENADAS, PRIORIDADE_ROTULOS, PRIORIDADES_ORDENADAS, CONCLUSAO_TEXTO_PADRAO } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { SelectResponsavel } from "@/components/ui/select-responsavel";
import type { EstrategiasPericiaisRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Campos "hub" do modelo (§2, §3, §4-principal, §6, §12, §14, §15) — os blocos repetíveis têm painel próprio. */
export function EstrategiaPericialPanel({
  estrategia,
  nomesResponsaveis,
}: {
  estrategia: EstrategiasPericiaisRow;
  nomesResponsaveis: string[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [conclusao, setConclusao] = useState(estrategia.conclusao_direcao_estrategica ?? "");

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarEstrategiaPericial(formData);
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
      <input type="hidden" name="id" value={estrategia.id} />
      <input type="hidden" name="processo_id" value={estrategia.processo_id} />

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Resumo técnico do caso</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Qual é a história técnico-pericial essencial para compreender o caso?</p>
      </div>
      <textarea name="resumo_tecnico_caso" rows={3} defaultValue={estrategia.resumo_tecnico_caso ?? ""} className={inputClass} />

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Questão central da prova</h2>
      </div>
      <div>
        <label htmlFor="questao_central" className={labelClass}>Questão central</label>
        <textarea id="questao_central" name="questao_central" rows={2} defaultValue={estrategia.questao_central ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="questoes_secundarias" className={labelClass}>Questões secundárias (uma por linha)</label>
        <textarea id="questoes_secundarias" name="questoes_secundarias" rows={3} defaultValue={estrategia.questoes_secundarias.join("\n")} className={inputClass} />
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Tese pericial</h2>
      </div>
      <div>
        <label htmlFor="tese_principal" className={labelClass}>Tese principal</label>
        <textarea id="tese_principal" name="tese_principal" rows={2} defaultValue={estrategia.tese_principal ?? ""} className={inputClass} />
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Cadeia probatória</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Estado anterior → Evento → Alteração/Intercorrência → Persistência/Evolução → Exame/Diagnóstico → Dano/Repercussão atual</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="cadeia_estado_anterior" className={labelClass}>Estado anterior</label>
          <textarea id="cadeia_estado_anterior" name="cadeia_estado_anterior" rows={2} defaultValue={estrategia.cadeia_estado_anterior ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cadeia_evento" className={labelClass}>Evento</label>
          <textarea id="cadeia_evento" name="cadeia_evento" rows={2} defaultValue={estrategia.cadeia_evento ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cadeia_alteracao" className={labelClass}>Alteração/Intercorrência</label>
          <textarea id="cadeia_alteracao" name="cadeia_alteracao" rows={2} defaultValue={estrategia.cadeia_alteracao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cadeia_persistencia" className={labelClass}>Persistência/Evolução</label>
          <textarea id="cadeia_persistencia" name="cadeia_persistencia" rows={2} defaultValue={estrategia.cadeia_persistencia ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cadeia_exame_diagnostico" className={labelClass}>Exame/Diagnóstico</label>
          <textarea id="cadeia_exame_diagnostico" name="cadeia_exame_diagnostico" rows={2} defaultValue={estrategia.cadeia_exame_diagnostico ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cadeia_dano_repercussao" className={labelClass}>Dano/Repercussão atual</label>
          <textarea id="cadeia_dano_repercussao" name="cadeia_dano_repercussao" rows={2} defaultValue={estrategia.cadeia_dano_repercussao ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Pontos essenciais a serem levados à perícia</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Não é ainda a peça formal de quesitos — só as perguntas estratégicas.</p>
      </div>
      <textarea name="pontos_pericia" rows={3} defaultValue={estrategia.pontos_pericia.join("\n")} placeholder="Uma pergunta estratégica por linha" className={inputClass} />

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Conclusão e direção estratégica</h2>
      </div>
      <div>
        <textarea name="conclusao_direcao_estrategica" rows={3} value={conclusao} onChange={(e) => setConclusao(e.target.value)} className={inputClass} />
        <button
          type="button"
          className="text-xs text-petroleo-600 hover:underline dark:text-petroleo-400 mt-1"
          onClick={() => setConclusao(conclusao.trim() ? `${conclusao}\n${CONCLUSAO_TEXTO_PADRAO}` : CONCLUSAO_TEXTO_PADRAO)}
        >
          + Inserir modelo padrão
        </button>
      </div>

      <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Próxima ação obrigatória</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="proxima_acao" className={labelClass}>Próxima ação</label>
          <select id="proxima_acao" name="proxima_acao" defaultValue={estrategia.proxima_acao ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {PROXIMAS_ACOES_ESTRATEGIA_ORDENADAS.map((p) => (
              <option key={p} value={p}>{PROXIMA_ACAO_ESTRATEGIA_ROTULOS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="proxima_acao_outra" className={labelClass}>Outro (se selecionado acima)</label>
          <input id="proxima_acao_outra" name="proxima_acao_outra" defaultValue={estrategia.proxima_acao_outra ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="responsavel" className={labelClass}>Responsável</label>
          <SelectResponsavel id="responsavel" name="responsavel" defaultValue={estrategia.responsavel} nomes={nomesResponsaveis} className={inputClass} />
        </div>
        <div>
          <label htmlFor="prazo" className={labelClass}>Prazo</label>
          <input id="prazo" name="prazo" type="date" defaultValue={estrategia.prazo ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="prioridade" className={labelClass}>Prioridade</label>
          <select id="prioridade" name="prioridade" defaultValue={estrategia.prioridade} className={inputClass}>
            {PRIORIDADES_ORDENADAS.map((p) => (
              <option key={p} value={p}>{PRIORIDADE_ROTULOS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>Local de emissão</label>
          <input id="local_emissao" name="local_emissao" defaultValue={estrategia.local_emissao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_emissao" className={labelClass}>Data de emissão</label>
          <input id="data_emissao" name="data_emissao" type="date" defaultValue={estrategia.data_emissao ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
