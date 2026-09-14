"use client";

import { useState } from "react";
import { gerarNaoComparecimento } from "./actions";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoNaoComparecimento = Pick<ProcessosRow, "id" | "agendamento_data" | "agendamento_horario">;

/**
 * Comunicação de Não Comparecimento ao Ato Pericial (nº17 da Biblioteca) —
 * campos digitados na hora de gerar (não persistem em `processos`), pré-
 * preenchidos com data/horário do agendamento já salvo como ponto de
 * partida — ela pode divergir (ex.: esperou até mais tarde) sem que isso
 * reescreva o agendamento original. Gerar este documento NUNCA altera
 * `agendamento_data`/`agendamento_horario` — a perícia que não aconteceu
 * continua com a data original na linha do tempo.
 */
export function NaoComparecimentoPanel({
  processo,
  versoes,
}: {
  processo: ProcessoNaoComparecimento;
  versoes: VersaoDocumento[];
}) {
  const [data, setData] = useState(processo.agendamento_data ?? "");
  const [horario, setHorario] = useState(processo.agendamento_horario?.slice(0, 5) ?? "");
  const [horarioChegada, setHorarioChegada] = useState("");
  const [tempoEspera, setTempoEspera] = useState("");
  const [pessoasPresentes, setPessoasPresentes] = useState("");

  const podeGerar = Boolean(data && horario);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          Data e horário vêm pré-preenchidos do agendamento já salvo, mas podem ser ajustados aqui sem alterar o
          agendamento original — este documento é um registro à parte, não uma correção dele.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nc_data" className={labelClass}>
              Data do ato
            </label>
            <input id="nc_data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="nc_horario" className={labelClass}>
              Horário
            </label>
            <input
              id="nc_horario"
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nc_chegada" className={labelClass}>
              Horário de chegada do perito (opcional)
            </label>
            <input
              id="nc_chegada"
              value={horarioChegada}
              onChange={(e) => setHorarioChegada(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nc_espera" className={labelClass}>
              Tempo de espera (opcional)
            </label>
            <input
              id="nc_espera"
              value={tempoEspera}
              onChange={(e) => setTempoEspera(e.target.value)}
              placeholder="ex.: 30 minutos"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="nc_presentes" className={labelClass}>
              Pessoas presentes (opcional)
            </label>
            <input
              id="nc_presentes"
              value={pessoasPresentes}
              onChange={(e) => setPessoasPresentes(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="nao_comparecimento"
          chave="nao-comparecimento"
          nomeDocumento="Comunicação de Não Comparecimento ao Ato Pericial"
          tituloBotao="Gerar Comunicação de Não Comparecimento"
          podeGerar={podeGerar}
          avisoBloqueio={!podeGerar ? "Informe ao menos a data e o horário do ato antes de gerar." : null}
          versoes={versoes}
          gerar={(dataAssinatura) =>
            gerarNaoComparecimento(
              processo.id,
              {
                data,
                horario,
                horarioChegadaPerito: horarioChegada || null,
                tempoEspera: tempoEspera || null,
                pessoasPresentes: pessoasPresentes || null,
              },
              dataAssinatura,
            )
          }
        />
      </div>
    </div>
  );
}
