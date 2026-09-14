"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarLiberacaoForma, salvarHonorariosRecebidos, gerarPedidoLiberacao } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import { LIBERACAO_FORMA_ORDENADA, LIBERACAO_FORMA_ROTULOS } from "./rotulos";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoLiberacao = Pick<
  ProcessosRow,
  "id" | "liberacao_forma" | "liberacao_solicitada_em" | "honorarios_recebidos_em"
>;

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

/**
 * Pedido de Liberação dos Honorários Periciais (nº23 da Biblioteca) — trilho
 * financeiro até liberação (e, com `honorarios_recebidos_em`, até
 * recebimento). `liberacao_forma` independente de
 * `deposito_forma_disponibilizacao` (momentos diferentes do processo).
 * `liberacao_solicitada_em` é gravado direto ao protocolar (não é uma
 * sugestão) — só exibido aqui como informação.
 *
 * `honorarios_recebidos_em` é o oposto: NUNCA gravado sozinho — só ela sabe
 * quando o dinheiro efetivamente cai, não existe evento no sistema que prove
 * isso. Enquanto estiver em branco com a liberação já solicitada, a Central
 * de Prazos mostra a pendência "sem prazo" correspondente.
 */
export function LiberacaoPanel({
  processo,
  temDadosBancariosCadastrados,
  versoes,
}: {
  processo: ProcessoLiberacao;
  temDadosBancariosCadastrados: boolean;
  versoes: VersaoDocumento[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const doBanco = { forma: processo.liberacao_forma ?? "" };
  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(processo.liberacao_forma);
  if (processo.liberacao_forma !== sync && !dirty && !salvando) {
    setSync(processo.liberacao_forma);
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

  async function salvar() {
    setSalvando(true);
    const r = await salvarLiberacaoForma(processo.id, f.forma || null);
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Forma de liberação salva." });
    router.refresh();
  }

  const [confirmarExposicao, setConfirmarExposicao] = useState(false);
  const podeExporDadosBancarios = f.forma === "transferencia" && temDadosBancariosCadastrados;

  // --- Confirmação de recebimento — fato dela, nunca inferido ---
  const [mensagemRecebimento, setMensagemRecebimento] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const doBancoRecebimento = { data: processo.honorarios_recebidos_em ?? "" };
  const [fr, setFr] = useState(doBancoRecebimento);
  const [salvoRecebimentoSnap, setSalvoRecebimentoSnap] = useState(() => JSON.stringify(doBancoRecebimento));
  const [salvandoRecebimento, setSalvandoRecebimento] = useState(false);
  const recebimentoDirty = JSON.stringify(fr) !== salvoRecebimentoSnap;

  const [syncRecebimento, setSyncRecebimento] = useState(processo.honorarios_recebidos_em);
  if (processo.honorarios_recebidos_em !== syncRecebimento && !recebimentoDirty && !salvandoRecebimento) {
    setSyncRecebimento(processo.honorarios_recebidos_em);
    setFr(doBancoRecebimento);
    setSalvoRecebimentoSnap(JSON.stringify(doBancoRecebimento));
  }

  useEffect(() => {
    if (!recebimentoDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [recebimentoDirty]);

  async function salvarRecebimento() {
    setSalvandoRecebimento(true);
    const r = await salvarHonorariosRecebidos(processo.id, fr.data || null);
    setSalvandoRecebimento(false);
    if ("error" in r) {
      setMensagemRecebimento({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoRecebimentoSnap(JSON.stringify(fr));
    setMensagemRecebimento({ tipo: "ok", texto: "Recebimento confirmado." });
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Forma de liberação
        </h3>
        {processo.liberacao_solicitada_em && (
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 flex flex-wrap items-center gap-2">
            <Selo variante="sucesso">Liberação solicitada em {dataCurta(processo.liberacao_solicitada_em)}</Selo>
            {processo.honorarios_recebidos_em ? (
              <Selo variante="sucesso">Recebido em {dataCurta(processo.honorarios_recebidos_em)}</Selo>
            ) : (
              <Selo variante="atencao">Aguardando confirmação de recebimento</Selo>
            )}
          </p>
        )}
        <div>
          <label htmlFor="liberacao_forma" className={labelClass}>
            Mediante
          </label>
          <select
            id="liberacao_forma"
            value={f.forma}
            onChange={(e) => setF({ forma: e.target.value })}
            className={inputClass}
          >
            <option value="">—</option>
            {LIBERACAO_FORMA_ORDENADA.map((fo) => (
              <option key={fo} value={fo}>
                {LIBERACAO_FORMA_ROTULOS[fo]}
              </option>
            ))}
          </select>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            Independente da forma de disponibilização do depósito — os dois podem divergir (ex.: depósito em conta
            judicial, liberação por transferência).
          </p>
        </div>
        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar" : "Salvo"}
        </Botao>
        {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
      </div>

      {processo.liberacao_solicitada_em && (
        <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
          <div>
            <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
              Confirmação de recebimento
            </h3>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
              Preencha quando o dinheiro efetivamente entrar na conta — o sistema não tem como saber sozinho.
              Enquanto ficar em branco, a Central de Prazos mantém isso como pendência (depósito judicial costuma
              demorar).
            </p>
          </div>
          <div>
            <label htmlFor="honorarios_recebidos_em" className={labelClass}>
              Data do recebimento
            </label>
            <input
              id="honorarios_recebidos_em"
              type="date"
              value={fr.data}
              onChange={(e) => setFr({ data: e.target.value })}
              className={inputClass}
            />
          </div>
          <Botao
            onClick={() => salvarRecebimento()}
            disabled={!recebimentoDirty && !salvandoRecebimento}
            carregando={salvandoRecebimento}
            textoCarregando="Salvando…"
          >
            {recebimentoDirty ? "Salvar" : "Salvo"}
          </Botao>
          {mensagemRecebimento && (
            <Toast tipo={mensagemRecebimento.tipo} texto={mensagemRecebimento.texto} onClose={() => setMensagemRecebimento(null)} />
          )}
        </div>
      )}

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="pedido_liberacao"
          chave="liberacao"
          nomeDocumento="Pedido de Liberação dos Honorários Periciais"
          tituloBotao="Gerar Pedido de Liberação"
          podeGerar={!dirty}
          avisoBloqueio={dirty ? "Salve a forma de liberação antes de gerar." : null}
          versoes={versoes}
          gerar={(dataAssinatura) => gerarPedidoLiberacao(processo.id, confirmarExposicao, dataAssinatura)}
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
            ) : f.forma === "transferencia" ? (
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
