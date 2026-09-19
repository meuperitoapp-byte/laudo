"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarDespesa, criarDespesa, excluirDespesa } from "./actions";
import { DESPESA_CATEGORIA_SEED } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import type { DespesasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

function moedaBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Saídas (despesas) — pedido da Dra. Fernanda ao ver o Financeiro
 * (19/09/2026): faltava o lado das saídas pra fechar a contabilidade.
 * Ledger simples, sem vínculo com processo (repasse a especialista, despesa
 * operacional, imposto/taxa etc.) — mesmo padrão de CRUD da Biblioteca
 * Pericial (form de edição por FormData, não estado controlado, porque a
 * categoria usa o ComboboxCatalogo compartilhado).
 */
export function DespesasPanel({ despesas, categoriasSugestoes }: { despesas: DespesasRow[]; categoriasSugestoes: string[] }) {
  return (
    <div className="space-y-4">
      {despesas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma saída registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {despesas.map((d) => (
            <ItemDespesa key={d.id} despesa={d} categoriasSugestoes={categoriasSugestoes} />
          ))}
        </ul>
      )}

      <NovaDespesaForm categoriasSugestoes={categoriasSugestoes} />
    </div>
  );
}

function ItemDespesa({ despesa, categoriasSugestoes }: { despesa: DespesasRow; categoriasSugestoes: string[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarDespesa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir a saída "${despesa.descricao}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirDespesa(despesa.id);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="flex items-start justify-between gap-3 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm text-nevoa-800 dark:text-nevoa-200 truncate">{despesa.descricao}</p>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            {dataCurta(despesa.data)}
            {despesa.categoria ? ` · ${despesa.categoria}` : ""}
          </p>
          {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100 tabular-nums">
            {moedaBRL(despesa.valor)}
          </span>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={isPending}
            className="text-xs text-vinho-600 hover:text-vinho-700 dark:text-vinho-400 disabled:opacity-30"
          >
            Excluir
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={despesa.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" name="data" defaultValue={despesa.data} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Valor</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="valor"
              defaultValue={despesa.valor}
              className={inputClass}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <input name="descricao" defaultValue={despesa.descricao} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Categoria (opcional)</label>
          <ComboboxCatalogo
            name="categoria"
            sugestoes={categoriasSugestoes}
            valorInicial={despesa.categoria ?? ""}
            rotuloNovo="Nova categoria"
          />
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

function NovaDespesaForm({ categoriasSugestoes }: { categoriasSugestoes: string[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarDespesa(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-nova-despesa") as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id="form-nova-despesa"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3"
    >
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Nova saída</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="despesa_data" className={labelClass}>
            Data
          </label>
          <input id="despesa_data" type="date" name="data" className={inputClass} required />
        </div>
        <div>
          <label htmlFor="despesa_valor" className={labelClass}>
            Valor
          </label>
          <input id="despesa_valor" type="number" step="0.01" min="0" name="valor" className={inputClass} required />
        </div>
      </div>
      <div>
        <label htmlFor="despesa_descricao" className={labelClass}>
          Descrição
        </label>
        <input id="despesa_descricao" name="descricao" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="despesa_categoria" className={labelClass}>
          Categoria (opcional)
        </label>
        <ComboboxCatalogo
          id="despesa_categoria"
          name="categoria"
          sugestoes={categoriasSugestoes}
          rotuloNovo="Nova categoria"
          placeholder="Ex.: Repasse a especialista..."
        />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Salvar saída
      </Botao>
    </form>
  );
}
