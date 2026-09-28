"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarOportunidade, salvarResultadoFollowup } from "./actions";
import { FLUXO_ROTULOS, STATUS_ROTULOS, RESULTADO_FOLLOWUP_ROTULOS } from "./catalogos";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { ContinuidadeOportunidadesRow, ContinuidadeRegrasRow } from "@/types/database";
import type { ContinuidadeFluxo, ContinuidadeResultadoFollowup, ContinuidadeStatus } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const STATUS_SELO: Record<ContinuidadeStatus, "neutro" | "atencao" | "sucesso" | "erro"> = {
  aberta: "atencao",
  contratou_principal: "sucesso",
  contratou_avulso: "sucesso",
  encerrada_sem_continuidade: "neutro",
  aguardando_marco: "neutro",
};

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const FLUXOS: ContinuidadeFluxo[] = ["avulso", "meu_perito", "cliente_saude_direto"];
const RESULTADOS: ContinuidadeResultadoFollowup[] = [
  "contratou_principal", "contratou_avulso", "ainda_avaliando", "sem_interesse", "valor_elevado",
  "fara_internamente", "caso_nao_prosseguiu", "sem_necessidade_agora", "aguardando_marco_processual",
  "sem_resposta", "outro",
];

/** §20 — fila de Continuidade de Serviços de UM processo. */
export function ContinuidadePanel({
  processoId,
  relacionamentoId,
  oportunidades,
  regras,
}: {
  processoId: string;
  relacionamentoId: string | null;
  oportunidades: ContinuidadeOportunidadesRow[];
  regras: ContinuidadeRegrasRow[];
}) {
  const ordenadas = [...oportunidades].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const regrasAtivas = regras.filter((r) => r.ativo);
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Continuidade de serviços</h2>
      {ordenadas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma oportunidade de continuidade registrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenadas.map((o) => (
            <OportunidadeItem key={o.id} item={o} processoId={processoId} />
          ))}
        </ul>
      )}
      <NovaOportunidadeForm processoId={processoId} relacionamentoId={relacionamentoId} regras={regrasAtivas} />
    </div>
  );
}

function OportunidadeItem({ item, processoId }: { item: ContinuidadeOportunidadesRow; processoId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(item.status === "aberta" && !item.resultado_followup);
  const [resultado, setResultado] = useState<ContinuidadeResultadoFollowup | "">(item.resultado_followup ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarResultadoFollowup(item.id, processoId, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">{item.servico_origem}</p>
          {item.gatilho && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">{item.gatilho}</p>}
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Prazo: {dataCurta(item.data_limite)}{item.fluxo ? ` · ${FLUXO_ROTULOS[item.fluxo]}` : ""}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Selo variante={STATUS_SELO[item.status]}>{STATUS_ROTULOS[item.status]}</Selo>
          {!editando && (
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">
              Follow-up
            </button>
          )}
        </div>
      </div>

      {!editando && item.resultado_followup && (
        <p className="text-xs text-nevoa-600 dark:text-nevoa-400">
          Resultado: {RESULTADO_FOLLOWUP_ROTULOS[item.resultado_followup]}{item.resultado_followup === "outro" && item.resultado_followup_outro ? ` — ${item.resultado_followup_outro}` : ""}
        </p>
      )}

      {editando && (
        <form action={salvar} className="space-y-3 pt-2 border-t border-nevoa-200 dark:border-nevoa-800">
          <div>
            <label className={labelClass}>Resultado do follow-up *</label>
            <select
              name="resultado_followup"
              required
              value={resultado}
              onChange={(e) => setResultado(e.target.value as ContinuidadeResultadoFollowup)}
              className={inputClass}
            >
              <option value="" disabled>Selecione…</option>
              {RESULTADOS.map((r) => (
                <option key={r} value={r}>{RESULTADO_FOLLOWUP_ROTULOS[r]}</option>
              ))}
            </select>
          </div>
          {resultado === "outro" && (
            <div>
              <label className={labelClass}>Descreva *</label>
              <input name="resultado_followup_outro" defaultValue={item.resultado_followup_outro ?? ""} className={inputClass} />
            </div>
          )}
          {(resultado === "ainda_avaliando" || resultado === "sem_resposta" || resultado === "valor_elevado") && (
            <div>
              <label className={labelClass}>Nova tentativa em</label>
              <input type="date" name="proxima_tentativa_data" defaultValue={item.proxima_tentativa_data ?? ""} className={inputClass} />
            </div>
          )}
          <div>
            <label className={labelClass}>Observação</label>
            <textarea name="observacao" rows={2} defaultValue={item.observacao ?? ""} className={inputClass} />
          </div>
          <div className="flex items-center gap-3">
            <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar resultado</Botao>
            <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
            {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
          </div>
        </form>
      )}
    </li>
  );
}

function NovaOportunidadeForm({
  processoId,
  relacionamentoId,
  regras,
}: {
  processoId: string;
  relacionamentoId: string | null;
  regras: ContinuidadeRegrasRow[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prazoDias, setPrazoDias] = useState(7);

  function servicoAlterado(valor: string) {
    const regra = regras.find((r) => r.servico_origem === valor);
    if (regra) setPrazoDias(regra.prazo_dias_padrao);
  }

  function registrar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await registrarOportunidade(processoId, relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Registrar oportunidade de continuidade</Botao>;
  }

  return (
    <form action={registrar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <div>
        <label className={labelClass}>Serviço concluído (origem) *</label>
        <ComboboxCatalogo
          name="servico_origem"
          sugestoes={regras.map((r) => r.servico_origem)}
          rotuloNovo="Novo serviço"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Gatilho</label>
        <input name="gatilho" placeholder="Ex.: Resultado positivo, sem continuidade contratada" className={inputClass} onChange={(e) => servicoAlterado(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Data do gatilho *</label>
          <input type="date" name="data_gatilho" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prazo (dias)</label>
          <input type="number" name="prazo_dias" value={prazoDias} onChange={(e) => setPrazoDias(Number(e.target.value) || 7)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Fluxo do cliente</label>
        <select name="fluxo" defaultValue="" className={inputClass}>
          <option value="">Selecione…</option>
          {FLUXOS.map((f) => (
            <option key={f} value={f}>{FLUXO_ROTULOS[f]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Observação</label>
        <textarea name="observacao" rows={2} className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Registrar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
