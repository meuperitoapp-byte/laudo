"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarNecessidadeEspecialista,
  criarNecessidadeEspecialista,
  excluirNecessidadeEspecialista,
  salvarNecessidadeEspecialista,
} from "./actions";
import { NECESSIDADE_ESPECIALISTA_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow, CasoNecessidadeEspecialistaRow, CasoQuestoesTecnicasRow } from "@/types/database";
import type { ViabilidadeNecessidadeEspecialista } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/**
 * Necessidade de especialista (§26) — gatilho no hub (Não/Recomendável/
 * Necessário) + detalhe repetível que só existe quando a resposta não é
 * "Não" (mesmo padrão de esconder da fatia 4: o conteúdo não existe fora
 * da condição). Ainda sem ação "resolver": `caso_necessidade_especialista`
 * não tem `resolvido_em` — migration pendente de aplicação (ver memória).
 */
export function NecessidadeEspecialistaPanel({
  analise,
  itens,
  questoes,
}: {
  analise: AnalisesViabilidadeRow;
  itens: CasoNecessidadeEspecialistaRow[];
  questoes: CasoQuestoesTecnicasRow[];
}) {
  const router = useRouter();
  const [necessidade, setNecessidade] = useState<ViabilidadeNecessidadeEspecialista | "">(analise.necessidade_especialista ?? "");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvarGatilho(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarNecessidadeEspecialista(formData);
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Salvo." });
      router.refresh();
    });
  }

  const questaoPorId = new Map(questoes.map((q) => [q.id, q]));
  const ordenados = [...itens].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const mostrarDetalhe = necessidade === "recomendavel" || necessidade === "necessario";

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <form action={salvarGatilho} className="space-y-3">
        <input type="hidden" name="analise_id" value={analise.id} />
        <input type="hidden" name="processo_id" value={analise.processo_id} />

        <div>
          <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Necessidade de especialista</h2>
          <label className={labelClass}>§26 — há necessidade de profissional complementar?</label>
          <select
            name="necessidade_especialista"
            value={necessidade}
            onChange={(e) => setNecessidade(e.target.value as ViabilidadeNecessidadeEspecialista | "")}
            className={`${inputClass} max-w-xs`}
          >
            <option value="">— Não respondido —</option>
            {(Object.keys(NECESSIDADE_ESPECIALISTA_ROTULOS) as (keyof typeof NECESSIDADE_ESPECIALISTA_ROTULOS)[]).map((n) => (
              <option key={n} value={n}>
                {NECESSIDADE_ESPECIALISTA_ROTULOS[n]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
            Salvar
          </Botao>
          {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
        </div>
      </form>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}

      {mostrarDetalhe && (
        <div className="space-y-3 border-t border-nevoa-200 dark:border-nevoa-800 pt-4">
          {ordenados.length === 0 ? (
            <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum especialista cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {ordenados.map((item) => (
                <NecessidadeEspecialistaItem
                  key={item.id}
                  item={item}
                  processoId={analise.processo_id}
                  questoes={questoes}
                  questao={item.questao_tecnica_id ? (questaoPorId.get(item.questao_tecnica_id) ?? null) : null}
                />
              ))}
            </ul>
          )}

          <NovaNecessidadeEspecialistaForm processoId={analise.processo_id} questoes={questoes} />
        </div>
      )}
    </div>
  );
}

function NecessidadeEspecialistaItem({
  item,
  processoId,
  questoes,
  questao,
}: {
  item: CasoNecessidadeEspecialistaRow;
  processoId: string;
  questoes: CasoQuestoesTecnicasRow[];
  questao: CasoQuestoesTecnicasRow | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarNecessidadeEspecialista(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir este registro de necessidade de especialista? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirNecessidadeEspecialista(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200">
              {item.especialidade || "Especialidade não informada"}
              {item.nome_especialista ? ` — ${item.nome_especialista}` : ""}
            </p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[item.finalidade, item.status, item.prazo, questao && `questão: ${questao.questao}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={excluir}
              disabled={isPending}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30"
            >
              Excluir
            </button>
          </div>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Especialidade</label>
            <input name="especialidade" defaultValue={item.especialidade ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nome do especialista</label>
            <input name="nome_especialista" defaultValue={item.nome_especialista ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Finalidade</label>
          <textarea name="finalidade" rows={2} defaultValue={item.finalidade ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Questão técnica</label>
          <select name="questao_tecnica_id" defaultValue={item.questao_tecnica_id ?? ""} className={inputClass}>
            <option value="">— Nenhuma —</option>
            {questoes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.questao}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Prioridade</label>
            <input name="prioridade" defaultValue={item.prioridade ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input type="date" name="prazo" defaultValue={item.prazo ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <input name="status" defaultValue={item.status ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
            Salvar
          </Botao>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
          >
            Cancelar
          </button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovaNecessidadeEspecialistaForm({ processoId, questoes }: { processoId: string; questoes: CasoQuestoesTecnicasRow[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarNecessidadeEspecialista(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-necessidade-especialista-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-necessidade-especialista-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar especialista</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Especialidade</label>
          <input name="especialidade" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nome do especialista</label>
          <input name="nome_especialista" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Finalidade</label>
        <textarea name="finalidade" rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Questão técnica</label>
        <select name="questao_tecnica_id" className={inputClass} defaultValue="">
          <option value="">— Nenhuma —</option>
          {questoes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.questao}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Prioridade</label>
          <input name="prioridade" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prazo</label>
          <input type="date" name="prazo" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <input name="status" className={inputClass} />
        </div>
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
