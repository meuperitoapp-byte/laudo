"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarTarefaCentral, atualizarTarefaCentral } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import { NIVEL_ROTULOS } from "./rotulos";
import type { CentralTarefasRow } from "@/types/database";
import type { NivelUrgencia } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const NIVEIS_ORDENADOS: readonly NivelUrgencia[] = [
  "critica", "urgente", "alta", "atencao", "programada", "sem_prazo",
];

export interface ProcessoOpcao {
  id: string;
  label: string;
}

/**
 * Formulário de tarefa/evento avulso (fatia 2) — mesmo componente serve
 * criar e editar. `tipo` decide o formulário desde a primeira pergunta
 * ("Evento ou Tarefa?") — `hora` só aparece pra evento, nunca um campo
 * "opcional" pendurado numa tarefa (distinção que a Dra. Fernanda confirmou
 * duas vezes).
 */
export function TarefaForm({
  tarefa,
  processos,
  statusSugestoes,
}: {
  /** null = criar; presente = editar. */
  tarefa: CentralTarefasRow | null;
  processos: ProcessoOpcao[];
  statusSugestoes: string[];
}) {
  const router = useRouter();
  const editando = tarefa !== null;

  const [tipo, setTipo] = useState<"tarefa" | "evento">(tarefa?.tipo ?? "tarefa");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemOk, setMensagemOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    setMensagemOk(null);
    startTransition(async () => {
      const resultado = editando
        ? await atualizarTarefaCentral(tarefa.id, formData)
        : await criarTarefaCentral(formData);
      // Sucesso na criação redireciona no servidor — só sobra tratar erro
      // (ou sucesso de EDIÇÃO, que não redireciona, fica na mesma tela).
      if (resultado && "error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setMensagemOk("Salvo.");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>O que é isto?</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="tarefa"
              checked={tipo === "tarefa"}
              onChange={() => setTipo("tarefa")}
            />
            Tarefa (data-limite)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="evento"
              checked={tipo === "evento"}
              onChange={() => setTipo("evento")}
            />
            Evento (hora marcada)
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="titulo" className={labelClass}>
          Título
        </label>
        <input id="titulo" name="titulo" defaultValue={tarefa?.titulo ?? ""} required className={inputClass} />
      </div>

      <div>
        <label htmlFor="descricao" className={labelClass}>
          Descrição / o que fazer (opcional)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={2}
          defaultValue={tarefa?.descricao ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="data" className={labelClass}>
            {tipo === "evento" ? "Data do evento" : "Data-limite"}
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={tarefa?.data ?? ""}
            required
            className={inputClass}
          />
        </div>
        {tipo === "evento" && (
          <div>
            <label htmlFor="hora" className={labelClass}>
              Horário
            </label>
            <input
              id="hora"
              name="hora"
              type="time"
              defaultValue={tarefa?.hora?.slice(0, 5) ?? ""}
              required
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="status" className={labelClass}>
          Status
        </label>
        <ComboboxCatalogo
          id="status"
          name="status"
          sugestoes={statusSugestoes}
          valorInicial={tarefa?.status ?? ""}
          rotuloNovo="Novo status"
          required
        />
      </div>

      <div>
        <label htmlFor="processo_id" className={labelClass}>
          Processo (opcional — deixe em branco pra tarefa avulsa)
        </label>
        <select id="processo_id" name="processo_id" defaultValue={tarefa?.processo_id ?? ""} className={inputClass}>
          <option value="">— nenhum —</option>
          {processos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {editando && (
        <div>
          <label htmlFor="nivel_urgencia_manual" className={labelClass}>
            Correção manual do nível de urgência
          </label>
          <select
            id="nivel_urgencia_manual"
            name="nivel_urgencia_manual"
            defaultValue={tarefa.nivel_urgencia_manual ?? ""}
            className={inputClass}
          >
            <option value="">Usar cálculo automático (pela data)</option>
            {NIVEIS_ORDENADOS.map((n) => (
              <option key={n} value={n}>
                {NIVEL_ROTULOS[n]}
              </option>
            ))}
          </select>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            Quando você escolhe um nível aqui, ele sempre vence o cálculo automático — nunca o contrário.
          </p>
        </div>
      )}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        {editando ? "Salvar" : "Criar"}
      </Botao>
      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}
      {mensagemOk && <Toast tipo="ok" texto={mensagemOk} onClose={() => setMensagemOk(null)} />}
    </form>
  );
}
