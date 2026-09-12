"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarDadosHonorarios, gerarManifestacaoConsolidada } from "./actions";
import { verificarTravaAceite, verificarAlertaAgendamento } from "./regras";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import { HONORARIOS_SITUACAO_ORDENADA, HONORARIOS_SITUACAO_ROTULOS, HONORARIOS_COMPLEXIDADE_ORDENADA, HONORARIOS_COMPLEXIDADE_ROTULOS } from "./rotulos";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoConsolidada = Pick<
  ProcessosRow,
  | "id"
  | "aceite_impedimento_suspeicao"
  | "aceite_competencia_tecnica"
  | "honorarios_situacao"
  | "honorarios_complexidade"
  | "honorarios_horas_tecnicas_estimadas"
  | "honorarios_valor_hora_tecnica"
  | "deposito_situacao"
  | "deposito_forma_disponibilizacao"
  | "agendamento_data"
  | "agendamento_deposito_previo_exigido"
>;

function SeloPronto({ pronto }: { pronto: boolean }) {
  return pronto ? <Selo variante="sucesso">Dados prontos</Selo> : <Selo variante="neutro">Incompleto</Selo>;
}

/**
 * Manifestação Consolidada — agrupa até 4 módulos (Aceite/Honorários/
 * Depósito/Agendamento) numa peça só. Ela marca quais módulos entram
 * (checkboxes desmarcados por padrão, com Selo de contexto — nunca um
 * pré-marcado pelo sistema). O checkbox do Aceite fica desabilitado com o
 * motivo ao lado quando a trava do §4.1 bloqueia — mesma regra da tela
 * standalone.
 *
 * Honorários não tem tela própria (só existe aqui) — o formulário dele mora
 * neste painel.
 */
export function ConsolidadaPanel({
  processo,
  temDadosBancariosCadastrados,
  versoes,
}: {
  processo: ProcessoConsolidada;
  temDadosBancariosCadastrados: boolean;
  versoes: VersaoDocumento[];
}) {
  const router = useRouter();

  // --- Formulário de Honorários (única tela que existe pra esses campos) ---
  const [msgHonorarios, setMsgHonorarios] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const doBancoHonorarios = {
    situacao: processo.honorarios_situacao ?? "",
    complexidade: processo.honorarios_complexidade ?? "",
    horas: processo.honorarios_horas_tecnicas_estimadas != null ? String(processo.honorarios_horas_tecnicas_estimadas) : "",
    valorHora: processo.honorarios_valor_hora_tecnica != null ? String(processo.honorarios_valor_hora_tecnica) : "",
  };
  const [fh, setFh] = useState(doBancoHonorarios);
  const [salvoHonorariosSnap, setSalvoHonorariosSnap] = useState(() => JSON.stringify(doBancoHonorarios));
  const [salvandoHonorarios, setSalvandoHonorarios] = useState(false);
  const honorariosDirty = JSON.stringify(fh) !== salvoHonorariosSnap;

  const [syncH, setSyncH] = useState(processo);
  if (processo !== syncH && !honorariosDirty && !salvandoHonorarios) {
    setSyncH(processo);
    setFh(doBancoHonorarios);
    setSalvoHonorariosSnap(JSON.stringify(doBancoHonorarios));
  }

  useEffect(() => {
    if (!honorariosDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [honorariosDirty]);

  const setH = <K extends keyof typeof fh>(k: K, v: (typeof fh)[K]) => setFh((s) => ({ ...s, [k]: v }));

  async function salvarHonorarios() {
    setSalvandoHonorarios(true);
    const r = await salvarDadosHonorarios({
      processoId: processo.id,
      situacao: fh.situacao || null,
      complexidade: fh.complexidade || null,
      horasTecnicasEstimadas: fh.horas,
      valorHoraTecnica: fh.valorHora,
    });
    setSalvandoHonorarios(false);
    if ("error" in r) {
      setMsgHonorarios({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoHonorariosSnap(JSON.stringify(fh));
    setMsgHonorarios({ tipo: "ok", texto: "Dados de honorários salvos." });
    router.refresh();
  }

  // --- Seleção de módulos ---
  const [modAceite, setModAceite] = useState(false);
  const [modHonorarios, setModHonorarios] = useState(false);
  const [modDeposito, setModDeposito] = useState(false);
  const [modAgendamento, setModAgendamento] = useState(false);
  const [confirmarExposicao, setConfirmarExposicao] = useState(false);

  const travaAceite = verificarTravaAceite(processo);
  const aceiteProntoParaMarcar = travaAceite.ok;
  const honorariosPronto = Boolean(processo.honorarios_situacao);
  const depositoPronto = Boolean(processo.deposito_situacao);
  const agendamentoPronto = Boolean(processo.agendamento_data);

  const podeExporDadosBancarios =
    modDeposito && processo.deposito_forma_disponibilizacao === "dados_bancarios" && temDadosBancariosCadastrados;

  const nenhumModuloMarcado = !modAceite && !modHonorarios && !modDeposito && !modAgendamento;

  /**
   * Diferente do Agendamento standalone (que pede confirmação DEPOIS de
   * tentar gerar, via `precisaConfirmar`), aqui o alerta é checado ANTES —
   * mais simples porque a Consolidada não tem uma ação de servidor dedicada
   * só pro alerta: se ela confirmar, a geração já sai pra valer, sem uma
   * segunda ida ao servidor só pra "confirmar de novo".
   */
  async function gerarComAlertaAgendamento(dataAssinatura: string) {
    if (modAgendamento) {
      const alerta = verificarAlertaAgendamento(processo);
      if (!alerta.ok) {
        const confirmou = window.confirm(`${alerta.aviso}\n\nDeseja prosseguir mesmo assim?`);
        if (!confirmou) return { error: "Geração cancelada." };
      }
    }
    const modulos = { aceite: modAceite, honorarios: modHonorarios, deposito: modDeposito, agendamento: modAgendamento };
    return gerarManifestacaoConsolidada(processo.id, modulos, confirmarExposicao, dataAssinatura);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <div>
          <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
            Módulos desta manifestação
          </h3>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            Marque quais módulos entram nesta versão — qualquer combinação é permitida, nenhum é obrigatório.
            Os dados de cada módulo continuam editáveis nas telas próprias (Aceite, Depósito, Agendamento).
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={modAceite}
              disabled={!aceiteProntoParaMarcar}
              onChange={(e) => setModAceite(e.target.checked)}
              className="mt-0.5"
            />
            <span className="flex-1">
              Aceite do Encargo Pericial <SeloPronto pronto={aceiteProntoParaMarcar} />
              {!aceiteProntoParaMarcar && (
                <span className="block text-xs text-vinho-600 dark:text-vinho-400 mt-0.5">{travaAceite.motivo}</span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={modHonorarios} onChange={(e) => setModHonorarios(e.target.checked)} className="mt-0.5" />
            <span className="flex-1">
              Proposta/Concordância com Honorários Periciais <SeloPronto pronto={honorariosPronto} />
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={modDeposito} onChange={(e) => setModDeposito(e.target.checked)} className="mt-0.5" />
            <span className="flex-1">
              Informação de Dados para Depósito dos Honorários <SeloPronto pronto={depositoPronto} />
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={modAgendamento} onChange={(e) => setModAgendamento(e.target.checked)} className="mt-0.5" />
            <span className="flex-1">
              Comunicação de Agendamento da Perícia <SeloPronto pronto={agendamentoPronto} />
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Dados de Honorários
        </h3>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          Não existe tela própria pra isso — Honorários só entra dentro da Manifestação Consolidada.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="honorarios_situacao" className={labelClass}>
              Situação
            </label>
            <select
              id="honorarios_situacao"
              value={fh.situacao}
              onChange={(e) => setH("situacao", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {HONORARIOS_SITUACAO_ORDENADA.map((s) => (
                <option key={s} value={s}>
                  {HONORARIOS_SITUACAO_ROTULOS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="honorarios_complexidade" className={labelClass}>
              Complexidade
            </label>
            <select
              id="honorarios_complexidade"
              value={fh.complexidade}
              onChange={(e) => setH("complexidade", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {HONORARIOS_COMPLEXIDADE_ORDENADA.map((c) => (
                <option key={c} value={c}>
                  {HONORARIOS_COMPLEXIDADE_ROTULOS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="honorarios_horas" className={labelClass}>
              Horas técnicas estimadas
            </label>
            <input
              id="honorarios_horas"
              type="number"
              step="0.5"
              value={fh.horas}
              onChange={(e) => setH("horas", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="honorarios_valor_hora" className={labelClass}>
              Valor da hora técnica (R$)
            </label>
            <input
              id="honorarios_valor_hora"
              type="number"
              step="0.01"
              value={fh.valorHora}
              onChange={(e) => setH("valorHora", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <Botao
          onClick={() => salvarHonorarios()}
          disabled={!honorariosDirty && !salvandoHonorarios}
          carregando={salvandoHonorarios}
          textoCarregando="Salvando…"
        >
          {honorariosDirty ? "Salvar" : "Salvo"}
        </Botao>
        {msgHonorarios && <Toast tipo={msgHonorarios.tipo} texto={msgHonorarios.texto} onClose={() => setMsgHonorarios(null)} />}
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="manifestacao_inicial"
          chave="consolidada"
          nomeDocumento="Manifestação Consolidada"
          tituloBotao="Gerar Manifestação Consolidada"
          podeGerar={!nenhumModuloMarcado}
          avisoBloqueio={nenhumModuloMarcado ? "Marque ao menos um módulo acima antes de gerar." : null}
          versoes={versoes}
          gerar={gerarComAlertaAgendamento}
          extra={
            podeExporDadosBancarios ? (
              <label className="flex items-start gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
                <input
                  type="checkbox"
                  checked={confirmarExposicao}
                  onChange={(e) => setConfirmarExposicao(e.target.checked)}
                  className="mt-0.5"
                />
                Confirmo que os dados bancários cadastrados em Configurações devem entrar neste documento.
              </label>
            ) : null
          }
        />
      </div>
    </div>
  );
}
