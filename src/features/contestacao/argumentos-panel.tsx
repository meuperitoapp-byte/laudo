"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarArgumentoContestacao,
  salvarArgumentoContestacao,
  excluirArgumentoContestacao,
  enviarArgumentoParaQuesitos,
} from "./actions";
import { REPERCUSSAO_ROTULOS, REPERCUSSAO_ORDENADAS, DECISAO_ROTULOS, DECISOES_ORDENADAS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { ContestacaoArgumentosRow } from "@/types/database";
import type { ContestacaoDecisao } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * §1/§2 do modelo — matriz de confronto: 1 card por argumento da contestação.
 * Mesmo padrão de lista+edição-inline+adicionar do PontosTecnicosPanel
 * (viabilidade), sem drag-and-drop — ordenado por `ordem`.
 */
export function ArgumentosContestacaoPanel({
  analiseId,
  processoId,
  argumentos,
}: {
  analiseId: string;
  processoId: string;
  argumentos: ContestacaoArgumentosRow[];
}) {
  const ordenados = [...argumentos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Matriz de confronto</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          Cada argumento relevante da contestação vira uma linha. Um mesmo argumento pode ter várias decisões.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum argumento cadastrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((item, i) => (
            <ArgumentoItem key={item.id} item={item} numero={i + 1} processoId={processoId} />
          ))}
        </ul>
      )}

      <NovoArgumentoForm analiseId={analiseId} processoId={processoId} />
    </div>
  );
}

function ArgumentoItem({
  item,
  numero,
  processoId,
}: {
  item: ContestacaoArgumentosRow;
  numero: number;
  processoId: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await salvarArgumentoContestacao(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir este argumento? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirArgumentoContestacao(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function enviarParaQuesitos() {
    setErro(null);
    startTransition(async () => {
      const resultado = await enviarArgumentoParaQuesitos(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-medium ${item.resolvido_em ? "text-nevoa-400 dark:text-nevoa-600 line-through" : "text-nevoa-800 dark:text-nevoa-200"}`}>
            {numero}. {item.argumento}
          </p>
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
        {item.analise_tecnica && (
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Análise técnica: {item.analise_tecnica}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {item.repercussao && <Selo variante="neutro">{REPERCUSSAO_ROTULOS[item.repercussao]}</Selo>}
          {item.decisoes.map((d) => (
            <Selo key={d} variante="atencao">
              {DECISAO_ROTULOS[d]}
            </Selo>
          ))}
          {item.incluir_na_replica && <Selo variante="sucesso">Incluir na réplica</Selo>}
          {item.resolvido_em && <Selo variante="sucesso">Resolvido</Selo>}
        </div>
        {item.decisoes.includes("transformar_quesito") && (
          <button
            type="button"
            onClick={enviarParaQuesitos}
            disabled={isPending}
            className="text-xs text-petroleo-600 hover:underline dark:text-petroleo-400 disabled:opacity-30"
          >
            + Enviar para Quesitos
          </button>
        )}
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <input type="hidden" name="resolvido_em_atual" value={item.resolvido_em ?? ""} />
        <div>
          <label className={labelClass}>O que a defesa sustenta</label>
          <textarea name="argumento" rows={2} defaultValue={item.argumento} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>O que a análise técnica identificou</label>
          <textarea name="analise_tecnica" rows={2} defaultValue={item.analise_tecnica ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Evidência / documento</label>
          <textarea
            name="evidencia_documento"
            rows={2}
            defaultValue={item.evidencia_documento ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Repercussão para nossa tese</label>
          <select name="repercussao" defaultValue={item.repercussao ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {REPERCUSSAO_ORDENADAS.map((r) => (
              <option key={r} value={r}>
                {REPERCUSSAO_ROTULOS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Orientação (o que fazer)</label>
          <textarea name="orientacao" rows={2} defaultValue={item.orientacao ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>O que fazer com este argumento? (múltipla escolha)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
            {DECISOES_ORDENADAS.map((d: ContestacaoDecisao) => (
              <label key={d} className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
                <input type="checkbox" name="decisoes" value={d} defaultChecked={item.decisoes.includes(d)} />
                {DECISAO_ROTULOS[d]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Outro (se marcado acima)</label>
          <input name="decisao_outra" defaultValue={item.decisao_outra ?? ""} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
          <input type="checkbox" name="incluir_na_replica" defaultChecked={item.incluir_na_replica} />
          Incluir na Orientação para Réplica
        </label>
        <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
          <input type="checkbox" name="resolvido" defaultChecked={Boolean(item.resolvido_em)} />
          Resolvido (some da Central de Prazos)
        </label>
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

function NovoArgumentoForm({ analiseId, processoId }: { analiseId: string; processoId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function adicionar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarArgumentoContestacao(analiseId, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="pt-1">
      <Botao variante="secundaria" onClick={adicionar} disabled={isPending} carregando={isPending} textoCarregando="Adicionando…">
        + Adicionar argumento
      </Botao>
      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
    </div>
  );
}
