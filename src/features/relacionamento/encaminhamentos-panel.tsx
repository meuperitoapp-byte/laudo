"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarEncaminhamento, salvarEncaminhamento } from "./actions";
import { ENCAMINHAMENTO_STATUS_ROTULOS, ENCAMINHAMENTO_CONTRATACAO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { RelacionamentoEncaminhamentosRow } from "@/types/database";
import type { EncaminhamentoStatus } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const STATUS_SELO: Record<EncaminhamentoStatus, "neutro" | "atencao" | "sucesso" | "erro"> = {
  encaminhado: "neutro",
  em_contato: "atencao",
  aceito: "sucesso",
  recusado: "erro",
  encerrado: "neutro",
};

interface EscritorioOpcao { id: string; nome: string }

/**
 * Conexões / Rede Parceira (§14-15) — encaminhamentos ORIGINADOS deste
 * cadastro (cliente saúde ou profissional sendo direcionado a um escritório
 * parceiro). Ranking financeiro NÃO decide o destino sozinho — a escolha do
 * escritório é sempre manual (função "localizar escritório parceiro" na UI).
 */
export function EncaminhamentosPanel({
  origemId,
  encaminhamentos,
  escritorios,
}: {
  origemId: string;
  encaminhamentos: (RelacionamentoEncaminhamentosRow & { destino_nome: string | null })[];
  escritorios: EscritorioOpcao[];
}) {
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Encaminhamentos</h2>
      {encaminhamentos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum encaminhamento registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {encaminhamentos.map((e) => (
            <EncaminhamentoItem key={e.id} item={e} origemId={origemId} />
          ))}
        </ul>
      )}
      <NovoEncaminhamentoForm origemId={origemId} escritorios={escritorios} />
    </div>
  );
}

function EncaminhamentoItem({ item, origemId }: { item: RelacionamentoEncaminhamentosRow & { destino_nome: string | null }; origemId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarEncaminhamento(item.id, origemId, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }

  const destino = item.destino_nome ?? item.destino_descricao ?? "—";

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">
              {item.destino_id ? (
                <Link href={`/relacionamento/${item.destino_id}`} className="hover:underline">{destino}</Link>
              ) : destino}
            </p>
            {item.demanda && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">{item.demanda}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Selo variante={STATUS_SELO[item.status]}>{ENCAMINHAMENTO_STATUS_ROTULOS[item.status]}</Selo>
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
          </div>
        </div>
        {item.contratacao_realizada !== "nao_informado" && (
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">Contratação: {ENCAMINHAMENTO_CONTRATACAO_ROTULOS[item.contratacao_realizada]}</p>
        )}
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue={item.status} className={inputClass}>
              {Object.entries(ENCAMINHAMENTO_STATUS_ROTULOS).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Contratação realizada</label>
            <select name="contratacao_realizada" defaultValue={item.contratacao_realizada} className={inputClass}>
              {Object.entries(ENCAMINHAMENTO_CONTRATACAO_ROTULOS).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Retorno do cliente</label>
          <textarea name="retorno_cliente" rows={2} defaultValue={item.retorno_cliente ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Retorno do escritório</label>
          <textarea name="retorno_escritorio" rows={2} defaultValue={item.retorno_escritorio ?? ""} className={inputClass} />
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

function NovoEncaminhamentoForm({ origemId, escritorios }: { origemId: string; escritorios: EscritorioOpcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarEncaminhamento(origemId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Localizar escritório parceiro / encaminhar</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <div>
        <label className={labelClass}>Escritório de destino (se já cadastrado)</label>
        <select name="destino_id" className={inputClass} defaultValue="">
          <option value="">— Não cadastrado (descrever abaixo) —</option>
          {escritorios.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Ou descrição do destino (ex.: &ldquo;Produto PERICONS&rdquo;)</label>
        <input name="destino_descricao" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Demanda</label>
        <input name="demanda" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Data *</label>
        <input type="date" name="data" required className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Encaminhar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
