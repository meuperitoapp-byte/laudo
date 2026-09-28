"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarAdvogado, salvarAdvogado, excluirAdvogado } from "./actions";
import { Botao } from "@/components/ui/button";
import type { RelacionamentoAdvogadosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Advogados vinculados ao escritório — ranking/financeiro ficam no escritório, aqui só a lista de nomes/contatos + aniversário individual. */
export function AdvogadosPanel({ relacionamentoId, advogados }: { relacionamentoId: string; advogados: RelacionamentoAdvogadosRow[] }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Advogados vinculados</h2>
      {advogados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum advogado cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {advogados.map((a) => (
            <AdvogadoItem key={a.id} item={a} relacionamentoId={relacionamentoId} />
          ))}
        </ul>
      )}
      <NovoAdvogadoForm relacionamentoId={relacionamentoId} />
    </div>
  );
}

function AdvogadoItem({ item, relacionamentoId }: { item: RelacionamentoAdvogadosRow; relacionamentoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarAdvogado(item.id, relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }
  function excluir() {
    if (!window.confirm(`Excluir ${item.nome}?`)) return;
    startTransition(async () => {
      const r = await excluirAdvogado(item.id, relacionamentoId);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{item.nome}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
              {[item.oab && `OAB ${item.oab}`, item.email, item.telefone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
            <button type="button" onClick={excluir} disabled={isPending} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30">Excluir</button>
          </div>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nome *</label>
          <input name="nome" defaultValue={item.nome} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>OAB</label>
          <input name="oab" defaultValue={item.oab ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Aniversário</label>
          <input type="date" name="data_nascimento" defaultValue={item.data_nascimento ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>E-mail</label>
          <input type="email" name="email" defaultValue={item.email ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Telefone</label>
          <input name="telefone" defaultValue={item.telefone ?? ""} className={inputClass} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovoAdvogadoForm({ relacionamentoId }: { relacionamentoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarAdvogado(relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Adicionar advogado</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className={labelClass}>Nome *</label>
        <input name="nome" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>OAB</label>
        <input name="oab" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Aniversário</label>
        <input type="date" name="data_nascimento" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>E-mail</label>
        <input type="email" name="email" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Telefone</label>
        <input name="telefone" className={inputClass} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Adicionando…">Adicionar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
