"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarLiberacaoForma, gerarPedidoLiberacao } from "./actions";
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

type ProcessoLiberacao = Pick<ProcessosRow, "id" | "liberacao_forma" | "liberacao_solicitada_em">;

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

/**
 * Pedido de Liberação dos Honorários Periciais (nº23 da Biblioteca) — trilho
 * financeiro até liberação. `liberacao_forma` independente de
 * `deposito_forma_disponibilizacao` (momentos diferentes do processo).
 * `liberacao_solicitada_em` é gravado direto ao protocolar (não é uma
 * sugestão) — só exibido aqui como informação.
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Forma de liberação
        </h3>
        {processo.liberacao_solicitada_em && (
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            <Selo variante="sucesso">Liberação solicitada em {dataCurta(processo.liberacao_solicitada_em)}</Selo>
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
