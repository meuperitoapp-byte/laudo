"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarCampanhaSaude, salvarCampanhaSaude } from "./calendario-actions";
import { CANAL_ROTULOS, CS_SITUACAO_ATUAL_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { CampanhasTematicasSaudeRow } from "@/types/database";
import type { RelacionamentoCanal } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const CANAIS: RelacionamentoCanal[] = ["whatsapp", "telefone", "email", "reuniao", "presencial", "outro"];

/** §22.6 — campanhas temáticas de saúde, configuráveis pela gestão. */
export function CampanhasSaudePanel({ campanhas }: { campanhas: CampanhasTematicasSaudeRow[] }) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Campanhas temáticas de saúde</h2>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
        &ldquo;Falecido&rdquo; é sempre excluído automaticamente, mesmo sem marcar abaixo.
      </p>
      <ul className="space-y-2">
        {campanhas.map((c) => (
          <CampanhaItem key={c.id} item={c} />
        ))}
      </ul>
      <NovaCampanhaForm />
    </div>
  );
}

function CampanhaItem({ item }: { item: CampanhasTematicasSaudeRow }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarCampanhaSaude(item.id, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{item.nome}</p>
            {item.area_clinica && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Área: {item.area_clinica}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!item.ativo && <Selo variante="neutro">Inativa</Selo>}
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
          </div>
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <div>
          <label className={labelClass}>Nome *</label>
          <input name="nome" defaultValue={item.nome} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Área clínica (em branco = todas)</label>
          <input name="area_clinica" defaultValue={item.area_clinica ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Situações permitidas (em branco = todas exceto excluídas)</label>
          <input name="situacoes_permitidas" defaultValue={item.situacoes_permitidas.join(", ")} placeholder={Object.keys(CS_SITUACAO_ATUAL_ROTULOS).join(", ")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Situações excluídas</label>
          <input name="situacoes_excluidas" defaultValue={item.situacoes_excluidas.join(", ")} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Canal</label>
            <select name="canal" defaultValue={item.canal ?? ""} className={inputClass}>
              <option value="">Selecione…</option>
              {CANAIS.map((c) => (
                <option key={c} value={c}>{CANAL_ROTULOS[c]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300 self-end pb-2">
            <input type="checkbox" name="ativo" defaultChecked={item.ativo} />
            Ativa
          </label>
        </div>
        <div>
          <label className={labelClass}>Mensagem/modelo</label>
          <textarea name="mensagem_modelo" rows={2} defaultValue={item.mensagem_modelo ?? ""} className={inputClass} />
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovaCampanhaForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarCampanhaSaude(formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Nova campanha temática</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <div>
        <label className={labelClass}>Nome *</label>
        <input name="nome" required placeholder="Ex.: Campanha temática de Oncologia" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Área clínica (em branco = todas)</label>
        <input name="area_clinica" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Canal</label>
        <select name="canal" defaultValue="" className={inputClass}>
          <option value="">Selecione…</option>
          {CANAIS.map((c) => (
            <option key={c} value={c}>{CANAL_ROTULOS[c]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Adicionar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
