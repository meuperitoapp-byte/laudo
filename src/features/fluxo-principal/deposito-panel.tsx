"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarDadosDeposito, gerarDadosDeposito } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import {
  SITUACAO_DEPOSITO_ORDENADA,
  SITUACAO_DEPOSITO_ROTULOS,
  RESPONSAVEL_ADIANTAMENTO_ORDENADA,
  RESPONSAVEL_ADIANTAMENTO_ROTULOS,
  FORMA_DISPONIBILIZACAO_ORDENADA,
  FORMA_DISPONIBILIZACAO_ROTULOS,
} from "./rotulos";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoDeposito = Pick<
  ProcessosRow,
  | "id"
  | "deposito_situacao"
  | "deposito_valor"
  | "deposito_data"
  | "deposito_responsavel_adiantamento"
  | "deposito_forma_disponibilizacao"
>;

/**
 * Informação de Dados para Depósito dos Honorários — dados + geração. O
 * checkbox de confirmação dos dados bancários é o mecanismo do modelo ("os
 * dados bancários devem ser... confirmados antes da geração") — não existe
 * valor default "true"; ela confirma a cada geração, e some/desabilita
 * sozinho quando a forma é conta judicial (aí os dados nunca entram, em
 * nenhuma hipótese — regra de secoes.ts, não só desta tela).
 */
export function DepositoPanel({
  processo,
  temDadosBancariosCadastrados,
  versoes,
}: {
  processo: ProcessoDeposito;
  temDadosBancariosCadastrados: boolean;
  versoes: VersaoDocumento[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const doBanco = {
    situacao: processo.deposito_situacao ?? "",
    valor: processo.deposito_valor != null ? String(processo.deposito_valor) : "",
    data: processo.deposito_data ?? "",
    responsavelAdiantamento: processo.deposito_responsavel_adiantamento ?? "",
    formaDisponibilizacao: processo.deposito_forma_disponibilizacao ?? "",
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
    const r = await salvarDadosDeposito({
      processoId: processo.id,
      situacao: f.situacao || null,
      valor: f.valor,
      data: f.data,
      responsavelAdiantamento: f.responsavelAdiantamento || null,
      formaDisponibilizacao: f.formaDisponibilizacao || null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Dados do depósito salvos." });
    router.refresh();
  }

  const [confirmarExposicao, setConfirmarExposicao] = useState(false);
  const ehContaJudicial = f.formaDisponibilizacao === "conta_judicial";
  const podeExporDadosBancarios = f.formaDisponibilizacao === "dados_bancarios" && temDadosBancariosCadastrados;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Identificação dos honorários e do depósito
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="deposito_situacao" className={labelClass}>
              Situação do depósito
            </label>
            <select
              id="deposito_situacao"
              value={f.situacao}
              onChange={(e) => set("situacao", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {SITUACAO_DEPOSITO_ORDENADA.map((s) => (
                <option key={s} value={s}>
                  {SITUACAO_DEPOSITO_ROTULOS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="deposito_valor" className={labelClass}>
              Valor já depositado (R$)
            </label>
            <input
              id="deposito_valor"
              type="number"
              step="0.01"
              value={f.valor}
              onChange={(e) => set("valor", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="deposito_data" className={labelClass}>
              Data do depósito
            </label>
            <input
              id="deposito_data"
              type="date"
              value={f.data}
              onChange={(e) => set("data", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="deposito_responsavel" className={labelClass}>
              Responsável pelo adiantamento
            </label>
            <select
              id="deposito_responsavel"
              value={f.responsavelAdiantamento}
              onChange={(e) => set("responsavelAdiantamento", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {RESPONSAVEL_ADIANTAMENTO_ORDENADA.map((r) => (
                <option key={r} value={r}>
                  {RESPONSAVEL_ADIANTAMENTO_ROTULOS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="deposito_forma" className={labelClass}>
              Forma de disponibilização
            </label>
            <select
              id="deposito_forma"
              value={f.formaDisponibilizacao}
              onChange={(e) => set("formaDisponibilizacao", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {FORMA_DISPONIBILIZACAO_ORDENADA.map((fd) => (
                <option key={fd} value={fd}>
                  {FORMA_DISPONIBILIZACAO_ROTULOS[fd]}
                </option>
              ))}
            </select>
            {ehContaJudicial && (
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
                Com conta judicial, os dados bancários cadastrados nunca entram no documento — em nenhuma hipótese.
              </p>
            )}
          </div>
        </div>

        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar" : "Salvo"}
        </Botao>
        {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="dados_deposito"
          chave="deposito"
          nomeDocumento="Informação de Dados para Depósito dos Honorários"
          tituloBotao="Gerar Informação de Dados para Depósito"
          podeGerar={!dirty}
          avisoBloqueio={dirty ? "Salve os dados acima antes de gerar — a geração usa os dados já salvos, não o que ainda está sendo editado." : null}
          versoes={versoes}
          gerar={(dataAssinatura) => gerarDadosDeposito(processo.id, confirmarExposicao, dataAssinatura)}
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
            ) : f.formaDisponibilizacao === "dados_bancarios" ? (
              <p className="text-xs text-ambar-700 dark:text-ambar-400">
                Nenhum dado bancário cadastrado em Configurações ainda — o documento sai sem a tabela de dados
                bancários até você cadastrar.
              </p>
            ) : null
          }
        />
      </div>
    </div>
  );
}
