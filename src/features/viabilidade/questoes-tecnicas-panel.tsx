"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarQuestaoTecnica, criarQuestaoTecnica, excluirQuestaoTecnica } from "./actions";
import { Botao } from "@/components/ui/button";
import type { CasoQuestoesTecnicasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/**
 * "+ Adicionar questão técnica" (§6) — repetível, ligada a `processo_id`
 * (não à análise): fica pronta pra Estratégia/Parecer reutilizarem as
 * mesmas linhas quando esses módulos existirem (§40).
 */
export function QuestoesTecnicasPanel({
  processoId,
  questoes,
}: {
  processoId: string;
  questoes: CasoQuestoesTecnicasRow[];
}) {
  const ordenadas = [...questoes].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.created_at.localeCompare(b.created_at));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Questões técnicas</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">Parte do Objeto da análise (§6).</p>
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma questão técnica cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenadas.map((q) => (
            <QuestaoTecnicaItem key={q.id} questao={q} processoId={processoId} />
          ))}
        </ul>
      )}

      <NovaQuestaoTecnicaForm processoId={processoId} />
    </div>
  );
}

function QuestaoTecnicaItem({ questao, processoId }: { questao: CasoQuestoesTecnicasRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarQuestaoTecnica(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir a questão "${questao.questao}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirQuestaoTecnica(questao.id, processoId);
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
              {questao.numero != null && <span className="text-nevoa-400 dark:text-nevoa-600">#{questao.numero} · </span>}
              {questao.questao}
            </p>
            {(questao.tema || questao.status) && (
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
                {[questao.tema, questao.status].filter(Boolean).join(" · ")}
              </p>
            )}
            {questao.resposta_preliminar && (
              <p className="text-xs text-nevoa-600 dark:text-nevoa-400 mt-1 whitespace-pre-wrap">
                Resposta preliminar: {questao.resposta_preliminar}
              </p>
            )}
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
        <input type="hidden" name="id" value={questao.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <div>
            <label className={labelClass}>Nº</label>
            <input type="number" name="numero" defaultValue={questao.numero ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tema</label>
            <input name="tema" defaultValue={questao.tema ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Questão</label>
          <textarea name="questao" rows={2} defaultValue={questao.questao} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <input name="status" defaultValue={questao.status ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fonte</label>
            <input name="fonte" defaultValue={questao.fonte ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Resposta preliminar</label>
          <textarea name="resposta_preliminar" rows={2} defaultValue={questao.resposta_preliminar ?? ""} className={inputClass} />
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

function NovaQuestaoTecnicaForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarQuestaoTecnica(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-nova-questao-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-nova-questao-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar questão técnica</h3>
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <div>
          <label className={labelClass}>Nº</label>
          <input type="number" name="numero" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tema</label>
          <input name="tema" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Questão</label>
        <textarea name="questao" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <input name="status" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fonte</label>
          <input name="fonte" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Resposta preliminar</label>
        <textarea name="resposta_preliminar" rows={2} className={inputClass} />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
