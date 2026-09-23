"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarProximaAcao } from "./actions";
import { PROXIMA_ACAO_RESPONSAVEL_SEED } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Próxima ação (§31) — campo único do hub (não repetível). Com
 * responsável + prazo preenchidos, vira a 15ª fonte da Central de
 * Prazos/Agenda — sem botão "resolver": quando a ação muda ou é
 * concluída, ela mesma atualiza/limpa este campo (mesmo princípio de
 * honorarios_recebidos_em, nunca inferido).
 */
export function ProximaAcaoPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarProximaAcao(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Próxima ação</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          §31 — nenhuma análise termina sem próxima ação, salvo encerramento definitivo. Com responsável e prazo,
          aparece em Hoje e na Agenda.
        </p>
      </div>

      <div>
        <label htmlFor="proxima_acao" className={labelClass}>
          Próxima ação
        </label>
        <textarea id="proxima_acao" name="proxima_acao" rows={2} defaultValue={analise.proxima_acao ?? ""} className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="proxima_acao_responsavel" className={labelClass}>
            Responsável
          </label>
          <ComboboxCatalogo
            id="proxima_acao_responsavel"
            name="proxima_acao_responsavel"
            sugestoes={[...PROXIMA_ACAO_RESPONSAVEL_SEED]}
            valorInicial={analise.proxima_acao_responsavel ?? ""}
            rotuloNovo="Outro responsável"
          />
        </div>
        <div>
          <label htmlFor="proxima_acao_prazo" className={labelClass}>
            Prazo
          </label>
          <input
            id="proxima_acao_prazo"
            type="date"
            name="proxima_acao_prazo"
            defaultValue={analise.proxima_acao_prazo ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="proxima_acao_prioridade" className={labelClass}>
            Prioridade
          </label>
          <input
            id="proxima_acao_prioridade"
            name="proxima_acao_prioridade"
            defaultValue={analise.proxima_acao_prioridade ?? ""}
            className={inputClass}
          />
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
