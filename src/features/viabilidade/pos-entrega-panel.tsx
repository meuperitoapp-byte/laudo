"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPosEntrega } from "./actions";
import { POS_ENTREGA_REUNIAO_ROTULOS, SATISFACAO_ROTULOS, ORCAMENTO_ENVIADO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const SATISFACOES_NEGATIVAS = new Set(["insatisfeito", "muito_insatisfeito"]);
const SATISFACOES_POSITIVAS = new Set(["muito_satisfeito", "satisfeito"]);
const CONCLUSOES_VIAVEIS = new Set(["viavel", "viavel_com_ressalvas", "viabilidade_condicionada"]);

/**
 * Pós-entrega e satisfação (§39) — última seção da spec. Campos únicos do
 * hub, sem repetição. Experiência negativa não pede avaliação/depoimento
 * com pendência aberta (regra do spec) — aqui isso vira só um aviso
 * informativo, já que a "tarefa de resolução" em si é registrada por fora
 * (Central de Prazos/Tarefas manuais), não automatizada por esta tela.
 */
export function PosEntregaPanel({ analise }: { analise: AnalisesViabilidadeRow }) {
  const router = useRouter();
  const [reuniao, setReuniao] = useState(analise.pos_entrega_reuniao ?? "");
  const [satisfacao, setSatisfacao] = useState(analise.pos_entrega_satisfacao ?? "");
  const [orcamentoEnviado, setOrcamentoEnviado] = useState(analise.pos_entrega_orcamento_enviado ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const viavel = analise.conclusao !== null && CONCLUSOES_VIAVEIS.has(analise.conclusao);
  const mostrarOrcamento = reuniao === "sim" && viavel;

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarPosEntrega(formData);
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
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Pós-entrega e satisfação</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">§39 — última seção da Análise de Viabilidade.</p>
      </div>

      <div className="max-w-xs">
        <label htmlFor="pos_entrega_reuniao" className={labelClass}>
          Houve reunião de apresentação do resultado?
        </label>
        <select
          id="pos_entrega_reuniao"
          name="pos_entrega_reuniao"
          value={reuniao}
          onChange={(e) => setReuniao(e.target.value)}
          className={inputClass}
        >
          <option value="">— Não respondido —</option>
          {(Object.keys(POS_ENTREGA_REUNIAO_ROTULOS) as (keyof typeof POS_ENTREGA_REUNIAO_ROTULOS)[]).map((r) => (
            <option key={r} value={r}>
              {POS_ENTREGA_REUNIAO_ROTULOS[r]}
            </option>
          ))}
        </select>
      </div>

      {mostrarOrcamento && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4">
          <div>
            <label htmlFor="pos_entrega_orcamento_enviado" className={labelClass}>
              Orçamento enviado?
            </label>
            <select
              id="pos_entrega_orcamento_enviado"
              name="pos_entrega_orcamento_enviado"
              value={orcamentoEnviado}
              onChange={(e) => setOrcamentoEnviado(e.target.value)}
              className={inputClass}
            >
              <option value="">— Não respondido —</option>
              {(Object.keys(ORCAMENTO_ENVIADO_ROTULOS) as (keyof typeof ORCAMENTO_ENVIADO_ROTULOS)[]).map((o) => (
                <option key={o} value={o}>
                  {ORCAMENTO_ENVIADO_ROTULOS[o]}
                </option>
              ))}
            </select>
          </div>
          {orcamentoEnviado === "sim" && (
            <div>
              <label htmlFor="pos_entrega_orcamento_enviado_em" className={labelClass}>
                Data de envio do orçamento
              </label>
              <input
                id="pos_entrega_orcamento_enviado_em"
                type="date"
                name="pos_entrega_orcamento_enviado_em"
                defaultValue={analise.pos_entrega_orcamento_enviado_em ?? ""}
                className={inputClass}
              />
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
                Se em 7 dias não houver contratação, aparece um lembrete na Central de Prazos pra você contatar o
                cliente.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pos_entrega_retorno_d7_em" className={labelClass}>
            Data do retorno D+7
          </label>
          <input
            id="pos_entrega_retorno_d7_em"
            type="date"
            name="pos_entrega_retorno_d7_em"
            defaultValue={analise.pos_entrega_retorno_d7_em ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pos_entrega_satisfacao" className={labelClass}>
            Experiência do cliente
          </label>
          <select
            id="pos_entrega_satisfacao"
            name="pos_entrega_satisfacao"
            value={satisfacao}
            onChange={(e) => setSatisfacao(e.target.value)}
            className={inputClass}
          >
            <option value="">— Não respondido —</option>
            {(Object.keys(SATISFACAO_ROTULOS) as (keyof typeof SATISFACAO_ROTULOS)[]).map((s) => (
              <option key={s} value={s}>
                {SATISFACAO_ROTULOS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {SATISFACOES_POSITIVAS.has(satisfacao) && (
        <p className="text-xs text-musgo-600 dark:text-musgo-400">
          Experiência positiva — elegível pra pedir avaliação/depoimento.
        </p>
      )}
      {SATISFACOES_NEGATIVAS.has(satisfacao) && (
        <p className="text-xs text-vinho-600 dark:text-vinho-400">
          Experiência negativa — cadastre uma tarefa de resolução (Tarefas/Central de Prazos) antes de pedir
          avaliação; não pede avaliação com pendência aberta.
        </p>
      )}

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
