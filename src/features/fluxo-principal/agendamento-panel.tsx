"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarDadosAgendamento, gerarAgendamentoPericia } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import {
  AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ORDENADA,
  AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ROTULOS,
} from "./rotulos";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoAgendamento = Pick<
  ProcessosRow,
  | "id"
  | "agendamento_data"
  | "agendamento_horario"
  | "agendamento_modalidade"
  | "agendamento_local"
  | "agendamento_endereco"
  | "agendamento_complemento"
  | "agendamento_referencia_acesso"
  | "agendamento_necessidade_acompanhante"
  | "agendamento_orientacoes_especificas"
  | "agendamento_deposito_previo_exigido"
>;

/**
 * Comunicação de Agendamento da Perícia — dados + geração.
 *
 * `agendamento_deposito_previo_exigido` tem 3 respostas possíveis MAIS o
 * estado "ainda não respondido" (`null`) — pedido explícito do Jeferson
 * (11/09/2026): esse estado precisa ficar VISÍVEL na tela (Selo de
 * "pendente" ao lado do campo), não só ser tratado como "sem alerta" por
 * baixo dos panos. Um campo declaradamente não respondido é diferente de um
 * "não" silencioso que ela não escolheu.
 */
export function AgendamentoPanel({
  processo,
  versoes,
}: {
  processo: ProcessoAgendamento;
  versoes: VersaoDocumento[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const doBanco = {
    data: processo.agendamento_data ?? "",
    horario: processo.agendamento_horario?.slice(0, 5) ?? "",
    modalidade: processo.agendamento_modalidade ?? "",
    local: processo.agendamento_local ?? "",
    endereco: processo.agendamento_endereco ?? "",
    complemento: processo.agendamento_complemento ?? "",
    referenciaAcesso: processo.agendamento_referencia_acesso ?? "",
    necessidadeAcompanhante: processo.agendamento_necessidade_acompanhante ?? "",
    orientacoesEspecificas: processo.agendamento_orientacoes_especificas ?? "",
    depositoPrevioExigido: processo.agendamento_deposito_previo_exigido ?? "",
  };
  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(processo);
  if (processo !== sync && !dirty && !salvando) {
    setSync(processo);
    setF(doBanco);
    setSalvoSnap(JSON.stringify(doBanco));
  }

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSalvando(true);
    const r = await salvarDadosAgendamento({
      processoId: processo.id,
      data: f.data,
      horario: f.horario,
      modalidade: f.modalidade,
      local: f.local,
      endereco: f.endereco,
      complemento: f.complemento,
      referenciaAcesso: f.referenciaAcesso,
      necessidadeAcompanhante: f.necessidadeAcompanhante || null,
      orientacoesEspecificas: f.orientacoesEspecificas,
      depositoPrevioExigido: f.depositoPrevioExigido || null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Dados do agendamento salvos." });
    router.refresh();
  }

  async function gerarComAlerta(dataAssinatura: string) {
    const r1 = await gerarAgendamentoPericia(processo.id, false, dataAssinatura);
    if ("error" in r1 && r1.precisaConfirmar) {
      const confirmou = window.confirm(`${r1.error}\n\nDeseja prosseguir mesmo assim?`);
      if (!confirmou) return { error: "Geração cancelada." };
      return gerarAgendamentoPericia(processo.id, true, dataAssinatura);
    }
    return r1;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Data, horário e local do ato pericial
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="agendamento_data" className={labelClass}>
              Data
            </label>
            <input
              id="agendamento_data"
              type="date"
              value={f.data}
              onChange={(e) => set("data", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="agendamento_horario" className={labelClass}>
              Horário
            </label>
            <input
              id="agendamento_horario"
              type="time"
              value={f.horario}
              onChange={(e) => set("horario", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="agendamento_modalidade" className={labelClass}>
              Modalidade
            </label>
            <input
              id="agendamento_modalidade"
              value={f.modalidade}
              onChange={(e) => set("modalidade", e.target.value)}
              placeholder="Presencial"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="agendamento_local" className={labelClass}>
              Local
            </label>
            <input
              id="agendamento_local"
              value={f.local}
              onChange={(e) => set("local", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="agendamento_endereco" className={labelClass}>
              Endereço completo
            </label>
            <input
              id="agendamento_endereco"
              value={f.endereco}
              onChange={(e) => set("endereco", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="agendamento_complemento" className={labelClass}>
              Complemento / sala
            </label>
            <input
              id="agendamento_complemento"
              value={f.complemento}
              onChange={(e) => set("complemento", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="agendamento_referencia" className={labelClass}>
              Referência / orientações de acesso
            </label>
            <input
              id="agendamento_referencia"
              value={f.referenciaAcesso}
              onChange={(e) => set("referenciaAcesso", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="agendamento_acompanhante" className={labelClass}>
            Necessidade de acompanhante
          </label>
          <select
            id="agendamento_acompanhante"
            value={f.necessidadeAcompanhante}
            onChange={(e) => set("necessidadeAcompanhante", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ORDENADA.map((n) => (
              <option key={n} value={n}>
                {AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ROTULOS[n]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="agendamento_orientacoes" className={labelClass}>
            Orientações específicas ao periciado (opcional)
          </label>
          <textarea
            id="agendamento_orientacoes"
            value={f.orientacoesEspecificas}
            onChange={(e) => set("orientacoesEspecificas", e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="agendamento_deposito_previo" className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
              Este processo exige depósito prévio à perícia?
            </label>
            {!f.depositoPrevioExigido && <Selo variante="atencao">Ainda não respondido</Selo>}
          </div>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">
            Fato do despacho/decisão do Juízo neste caso específico — varia processo a processo, o sistema não
            deduz isso sozinho a partir da situação do depósito.
          </p>
          <select
            id="agendamento_deposito_previo"
            value={f.depositoPrevioExigido}
            onChange={(e) => set("depositoPrevioExigido", e.target.value)}
            className={inputClass}
          >
            <option value="">— ainda não respondido —</option>
            <option value="sim">Sim, este processo exige depósito prévio à perícia</option>
            <option value="nao">Não exige</option>
            <option value="nao_aplicavel">Não aplicável</option>
          </select>
        </div>

        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar" : "Salvo"}
        </Botao>
        {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="agendamento_pericia"
          chave="agendamento"
          nomeDocumento="Comunicação de Agendamento da Perícia"
          tituloBotao="Gerar Comunicação de Agendamento"
          podeGerar={Boolean(processo.agendamento_data && !dirty)}
          avisoBloqueio={
            dirty
              ? "Salve os dados de agendamento antes de gerar."
              : !processo.agendamento_data
                ? "Preencha ao menos a data do agendamento antes de gerar."
                : null
          }
          versoes={versoes}
          gerar={gerarComAlerta}
        />
      </div>
    </div>
  );
}
