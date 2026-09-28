"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarInteracao } from "./actions";
import { CANAL_ROTULOS, RESULTADO_INTERACAO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { SelectResponsavel } from "@/components/ui/select-responsavel";
import type { RelacionamentoInteracoesRow } from "@/types/database";
import type { RelacionamentoCanal } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Histórico de contatos — toda interação registrada aqui atualiza "último
 * contato" e a faixa (verde/amarelo/laranja/vermelho) automaticamente (ver
 * ranking.ts). Data SEM default "hoje" no input (pedido dela, 26/09/2026).
 */
export function InteracoesPanel({
  relacionamentoId,
  interacoes,
  nomesResponsaveis,
}: {
  relacionamentoId: string;
  interacoes: RelacionamentoInteracoesRow[];
  nomesResponsaveis: string[];
}) {
  const ordenadas = [...interacoes].sort((a, b) => b.data.localeCompare(a.data));
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Histórico de contatos</h2>
      {ordenadas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum contato registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenadas.map((i) => (
            <li key={i.id} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-4 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-nevoa-800 dark:text-nevoa-200">{dataCurta(i.data)} — {CANAL_ROTULOS[i.canal]}</span>
                {i.responsavel && <span className="text-xs text-nevoa-500 dark:text-nevoa-400">{i.responsavel}</span>}
              </div>
              {i.observacao && <p className="text-xs text-nevoa-600 dark:text-nevoa-400 mt-1">{i.observacao}</p>}
              {i.campanha && (
                <p className="text-xs text-petroleo-600 dark:text-petroleo-400 mt-1">
                  Campanha: {i.campanha}{i.resultado ? ` — ${RESULTADO_INTERACAO_ROTULOS[i.resultado]}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <NovaInteracaoForm relacionamentoId={relacionamentoId} nomesResponsaveis={nomesResponsaveis} />
    </div>
  );
}

const CANAIS: RelacionamentoCanal[] = ["whatsapp", "telefone", "email", "reuniao", "presencial", "outro"];

function NovaInteracaoForm({ relacionamentoId, nomesResponsaveis }: { relacionamentoId: string; nomesResponsaveis: string[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function registrar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await registrarInteracao(relacionamentoId, formData);
      if ("error" in r) return setErro(r.error);
      (document.getElementById(`form-interacao-${relacionamentoId}`) as HTMLFormElement)?.reset();
      router.refresh();
    });
  }

  return (
    <form id={`form-interacao-${relacionamentoId}`} action={registrar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400">Registrar contato</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Data *</label>
          <input type="date" name="data" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Canal *</label>
          <select name="canal" required className={inputClass} defaultValue="">
            <option value="" disabled>Selecione…</option>
            {CANAIS.map((c) => (
              <option key={c} value={c}>{CANAL_ROTULOS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Responsável</label>
          <SelectResponsavel name="responsavel" nomes={nomesResponsaveis} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Campanha (se aplicável)</label>
          <input name="campanha" placeholder="Ex.: Presente de fim de ano 2026" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Resultado (se for campanha)</label>
          <select name="resultado" defaultValue="" className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(RESULTADO_INTERACAO_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Observação</label>
        <textarea name="observacao" rows={2} className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Registrando…">Registrar contato</Botao>
        {erro && <span className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
