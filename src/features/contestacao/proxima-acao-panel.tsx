"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarProximaAcaoContestacao } from "./actions";
import { PROXIMA_ACAO_ROTULOS, PROXIMA_ACAO_ORDENADAS, PRIORIDADE_ROTULOS, PRIORIDADES_ORDENADAS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { SelectResponsavel } from "@/components/ui/select-responsavel";
import type { AnalisesContestacaoRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** §3 do modelo — "a análise não deve ser concluída sem a definição do próximo movimento do caso". */
export function ProximaAcaoContestacaoPanel({
  analise,
  nomesResponsaveis,
}: {
  analise: AnalisesContestacaoRow;
  nomesResponsaveis: string[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarProximaAcaoContestacao(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Próxima ação obrigatória</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Qual é o próximo movimento do caso?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="proxima_acao" className={labelClass}>
            Próxima ação
          </label>
          <select id="proxima_acao" name="proxima_acao" defaultValue={analise.proxima_acao ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {PROXIMA_ACAO_ORDENADAS.map((p) => (
              <option key={p} value={p}>
                {PROXIMA_ACAO_ROTULOS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="proxima_acao_outra" className={labelClass}>
            Outro (se selecionado acima)
          </label>
          <input
            id="proxima_acao_outra"
            name="proxima_acao_outra"
            defaultValue={analise.proxima_acao_outra ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="responsavel" className={labelClass}>
            Responsável
          </label>
          <SelectResponsavel
            id="responsavel"
            name="responsavel"
            defaultValue={analise.responsavel}
            nomes={nomesResponsaveis}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="prazo" className={labelClass}>
            Prazo
          </label>
          <input id="prazo" name="prazo" type="date" defaultValue={analise.prazo ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="prioridade" className={labelClass}>
            Prioridade
          </label>
          <select id="prioridade" name="prioridade" defaultValue={analise.prioridade} className={inputClass}>
            {PRIORIDADES_ORDENADAS.map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_ROTULOS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
        <input type="checkbox" name="concluida" defaultChecked={analise.concluida} />
        Análise concluída
      </label>

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
