"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarMovimentacao, criarMovimentacao, excluirMovimentacao } from "./actions";
import { TIPO_MOVIMENTACAO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import type { MovimentacoesFinanceirasRow } from "@/types/database";
import type { TipoMovimentacaoFinanceira } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

export interface ProcessoOpcao {
  id: string;
  label: string;
}

function moedaBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Movimentações (entrada/saída) — pedido do financeiro dela (21/09/2026,
 * repassado pelo Jeferson): um ledger único pra bater com o extrato
 * bancário. Substitui o antigo painel de "Saídas" (só despesas). Entrada
 * SEMPRE exige processo vinculado (decisão dela); saída pode ou não ter
 * (Impostos, Mensalidade de sistema não têm). 100% manual nesta primeira
 * versão — nenhuma automação a partir de honorarios_recebidos_em/
 * situacao_financeira.
 */
export function MovimentacoesPanel({
  movimentacoes,
  processosOpcoes,
  categoriasSugestoes,
  contasSugestoes,
}: {
  movimentacoes: MovimentacoesFinanceirasRow[];
  processosOpcoes: ProcessoOpcao[];
  categoriasSugestoes: string[];
  contasSugestoes: string[];
}) {
  const processoPorId = new Map(processosOpcoes.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      {movimentacoes.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma movimentação encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {movimentacoes.map((m) => (
            <ItemMovimentacao
              key={m.id}
              movimentacao={m}
              processosOpcoes={processosOpcoes}
              processo={m.processo_id ? (processoPorId.get(m.processo_id) ?? null) : null}
              categoriasSugestoes={categoriasSugestoes}
              contasSugestoes={contasSugestoes}
            />
          ))}
        </ul>
      )}

      <NovaMovimentacaoForm processosOpcoes={processosOpcoes} categoriasSugestoes={categoriasSugestoes} contasSugestoes={contasSugestoes} />
    </div>
  );
}

function SeletorProcesso({
  processosOpcoes,
  defaultValue,
  obrigatorio,
}: {
  processosOpcoes: ProcessoOpcao[];
  defaultValue: string;
  obrigatorio: boolean;
}) {
  return (
    <select name="processo_id" defaultValue={defaultValue} className={inputClass} required={obrigatorio}>
      <option value="">{obrigatorio ? "— Selecione —" : "— Nenhum —"}</option>
      {processosOpcoes.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function ItemMovimentacao({
  movimentacao,
  processosOpcoes,
  processo,
  categoriasSugestoes,
  contasSugestoes,
}: {
  movimentacao: MovimentacoesFinanceirasRow;
  processosOpcoes: ProcessoOpcao[];
  processo: ProcessoOpcao | null;
  categoriasSugestoes: string[];
  contasSugestoes: string[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<TipoMovimentacaoFinanceira>(movimentacao.tipo);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarMovimentacao(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir esta movimentação? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirMovimentacao(movimentacao.id);
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
          <p className="text-sm text-nevoa-800 dark:text-nevoa-200 truncate">
            {processo ? processo.label : (movimentacao.observacoes ?? movimentacao.categoria ?? "—")}
          </p>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            {[
              dataCurta(movimentacao.data),
              movimentacao.categoria,
              movimentacao.conta,
              processo && movimentacao.observacoes,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-sm font-medium tabular-nums ${
              movimentacao.tipo === "entrada" ? "text-musgo-600 dark:text-musgo-400" : "text-vinho-600 dark:text-vinho-400"
            }`}
          >
            {movimentacao.tipo === "entrada" ? "+" : "-"} {moedaBRL(movimentacao.valor)}
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
        <input type="hidden" name="id" value={movimentacao.id} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMovimentacaoFinanceira)}
              className={inputClass}
            >
              <option value="entrada">{TIPO_MOVIMENTACAO_ROTULOS.entrada}</option>
              <option value="saida">{TIPO_MOVIMENTACAO_ROTULOS.saida}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" name="data" defaultValue={movimentacao.data} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Valor</label>
            <input type="number" step="0.01" min="0" name="valor" defaultValue={movimentacao.valor} className={inputClass} required />
          </div>
        </div>
        <div>
          <label className={labelClass}>Processo {tipo === "entrada" ? "" : "(opcional)"}</label>
          <SeletorProcesso processosOpcoes={processosOpcoes} defaultValue={movimentacao.processo_id ?? ""} obrigatorio={tipo === "entrada"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Categoria</label>
            <ComboboxCatalogo name="categoria" sugestoes={categoriasSugestoes} valorInicial={movimentacao.categoria ?? ""} rotuloNovo="Nova categoria" />
          </div>
          <div>
            <label className={labelClass}>Conta</label>
            <ComboboxCatalogo name="conta" sugestoes={contasSugestoes} valorInicial={movimentacao.conta ?? ""} rotuloNovo="Nova conta" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Observações (opcional)</label>
          <input name="observacoes" defaultValue={movimentacao.observacoes ?? ""} className={inputClass} />
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

function NovaMovimentacaoForm({
  processosOpcoes,
  categoriasSugestoes,
  contasSugestoes,
}: {
  processosOpcoes: ProcessoOpcao[];
  categoriasSugestoes: string[];
  contasSugestoes: string[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoMovimentacaoFinanceira>("saida");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarMovimentacao(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-nova-movimentacao") as HTMLFormElement | null)?.reset();
      setTipo("saida");
      router.refresh();
    });
  }

  return (
    <form
      id="form-nova-movimentacao"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3"
    >
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Nova movimentação</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="mov_tipo_form" className={labelClass}>
            Tipo
          </label>
          <select
            id="mov_tipo_form"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimentacaoFinanceira)}
            className={inputClass}
          >
            <option value="saida">{TIPO_MOVIMENTACAO_ROTULOS.saida}</option>
            <option value="entrada">{TIPO_MOVIMENTACAO_ROTULOS.entrada}</option>
          </select>
        </div>
        <div>
          <label htmlFor="mov_data_form" className={labelClass}>
            Data
          </label>
          <input id="mov_data_form" type="date" name="data" className={inputClass} required />
        </div>
        <div>
          <label htmlFor="mov_valor_form" className={labelClass}>
            Valor
          </label>
          <input id="mov_valor_form" type="number" step="0.01" min="0" name="valor" className={inputClass} required />
        </div>
      </div>
      <div>
        <label htmlFor="mov_processo_form" className={labelClass}>
          Processo {tipo === "entrada" ? "" : "(opcional)"}
        </label>
        <SeletorProcesso processosOpcoes={processosOpcoes} defaultValue="" obrigatorio={tipo === "entrada"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mov_categoria_form" className={labelClass}>
            Categoria (opcional)
          </label>
          <ComboboxCatalogo id="mov_categoria_form" name="categoria" sugestoes={categoriasSugestoes} rotuloNovo="Nova categoria" />
        </div>
        <div>
          <label htmlFor="mov_conta_form" className={labelClass}>
            Conta (opcional)
          </label>
          <ComboboxCatalogo id="mov_conta_form" name="conta" sugestoes={contasSugestoes} rotuloNovo="Nova conta" />
        </div>
      </div>
      <div>
        <label htmlFor="mov_observacoes_form" className={labelClass}>
          Observações (opcional)
        </label>
        <input id="mov_observacoes_form" name="observacoes" className={inputClass} placeholder="Ex.: Mensalidade Sistema X..." />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Salvar movimentação
      </Botao>
    </form>
  );
}
