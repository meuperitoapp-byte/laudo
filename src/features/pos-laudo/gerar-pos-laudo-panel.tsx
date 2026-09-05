"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarPosLaudoProtocolado } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

export interface VersaoPosLaudo {
  id: string;
  versao: number;
  tipo: string;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
  protocolado: boolean;
  protocoladoEm: string | null;
  protocoloId: string | null;
  /** Nova Conclusão Vigente congelada no snapshot desta versão — null quando a repercussão não altera a conclusão. */
  conclusaoVigenteTexto: string | null;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

/** "YYYY-MM-DD" de hoje no fuso do NAVEGADOR (não toISOString, que é UTC e pode voltar um dia). */
function hojeIsoLocal(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/**
 * Painel de geração de uma saída de pós-laudo (Esclarecimentos, Retificação
 * — e reusável pra Complementação quando a fatia 7 chegar) — mesmo padrão
 * visual do `GerarLaudoPanel` (geracao-laudo), com um cuidado a mais no
 * diálogo de protocolar: aqui a versão protocolada pode gravar uma Nova
 * Conclusão Vigente, então protocolar a versão errada (não a mais recente
 * gerada deste ciclo) tem mais peso do que no laudo principal — o diálogo
 * avisa qual versão existe mais nova e qual texto de conclusão vigente
 * SERIA gravado pela versão escolhida, sem bloquear a ação.
 *
 * `chave` (ex.: "esclarecimentos", "retificacao") só existe pra dar um id
 * de elemento único ao campo de data quando os dois painéis renderizam na
 * mesma página do ciclo.
 */
export function GerarPosLaudoPanel({
  processoId,
  cicloId,
  chave,
  nomeDocumento,
  tituloBotao,
  podeGerar,
  versoes,
  gerar: gerarAcao,
}: {
  processoId: string;
  cicloId: string;
  chave: string;
  /** Nome do documento por extenso, usado no diálogo de protocolar (ex.: "Esclarecimentos ao Laudo Médico-Pericial"). */
  nomeDocumento: string;
  /** Texto do botão de gerar (ex.: "Gerar Esclarecimentos"). */
  tituloBotao: string;
  podeGerar: boolean;
  versoes: VersaoPosLaudo[];
  gerar: (cicloId: string, processoId: string, dataAssinatura: string) => Promise<{ error: string } | { success: true; versao: number }>;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dataAssinatura, setDataAssinatura] = useState(() => hojeIsoLocal());

  const versaoMaisRecente = versoes.reduce<VersaoPosLaudo | null>(
    (max, v) => (!max || v.versao > max.versao ? v : max),
    null,
  );

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarAcao(cicloId, processoId, dataAssinatura);
      if ("error" in resultado) {
        setToast({ tipo: "erro", texto: resultado.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Versão ${resultado.versao} gerada.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="max-w-xs">
          <label
            htmlFor={`data-assinatura-${chave}`}
            className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
          >
            Data da assinatura
          </label>
          <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mb-1">
            É a data do ato que vai no documento — confira antes de gerar se o protocolo vai acontecer em
            outro dia.
          </p>
          <input
            id={`data-assinatura-${chave}`}
            type="date"
            value={dataAssinatura}
            onChange={(e) => setDataAssinatura(e.target.value)}
            className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
          />
        </div>
        <Botao onClick={gerar} disabled={!podeGerar || !dataAssinatura} carregando={isPending} textoCarregando="Gerando…">
          {tituloBotao}
        </Botao>
      </div>

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">
          Versões geradas neste ciclo
        </h2>
        {versoes.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma versão gerada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-nevoa-900 dark:text-nevoa-100">Versão {v.versao}</span>
                  <span className="text-nevoa-500 dark:text-nevoa-400">{dataHora(v.criadoEm)}</span>
                  {v.protocolado && (
                    <Selo variante="sucesso">
                      Protocolado{v.protocoladoEm ? ` em ${dataCurta(v.protocoladoEm)}` : ""}
                      {v.protocoloId ? ` · nº ${v.protocoloId}` : ""}
                    </Selo>
                  )}
                  {v.conclusaoVigenteTexto && <Selo variante="atencao">Grava nova conclusão vigente</Selo>}
                </div>
                <div className="flex items-center gap-4">
                  {v.urlPdf && (
                    <a
                      href={v.urlPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      PDF
                    </a>
                  )}
                  {v.urlDocx && (
                    <a
                      href={v.urlDocx}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      Word
                    </a>
                  )}
                  {!v.protocolado && (
                    <MarcarProtocoladoAcao
                      processoId={processoId}
                      cicloId={cicloId}
                      laudoGeradoId={v.id}
                      versao={v.versao}
                      nomeDocumento={nomeDocumento}
                      conclusaoVigenteTexto={v.conclusaoVigenteTexto}
                      versaoMaisRecente={versaoMaisRecente}
                      onErro={(texto) => setToast({ tipo: "erro", texto })}
                      onOk={() => {
                        setToast({ tipo: "ok", texto: `Versão ${v.versao} marcada como protocolada.` });
                        router.refresh();
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && <Toast tipo={toast.tipo} texto={toast.texto} onClose={() => setToast(null)} />}
    </div>
  );
}

/**
 * Botão + diálogo de confirmação pra marcar uma versão de pós-laudo como
 * protocolada. Igual ao do laudo principal, com um bloco a mais: se a versão
 * escolhida não for a mais recente gerada, avisa (sem bloquear) qual é a mais
 * nova e qual texto de conclusão vigente a versão ESCOLHIDA vai gravar.
 */
function MarcarProtocoladoAcao({
  processoId,
  cicloId,
  laudoGeradoId,
  versao,
  nomeDocumento,
  conclusaoVigenteTexto,
  versaoMaisRecente,
  onOk,
  onErro,
}: {
  processoId: string;
  cicloId: string;
  laudoGeradoId: string;
  versao: number;
  nomeDocumento: string;
  conclusaoVigenteTexto: string | null;
  versaoMaisRecente: VersaoPosLaudo | null;
  onOk: () => void;
  onErro: (texto: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [protocoloId, setProtocoloId] = useState("");
  const [isPending, startTransition] = useTransition();

  const naoEhAMaisRecente = Boolean(versaoMaisRecente && versaoMaisRecente.versao !== versao);

  function abrir() {
    setProtocoloId("");
    dialogRef.current?.showModal();
  }

  function confirmar() {
    startTransition(async () => {
      const r = await marcarPosLaudoProtocolado(laudoGeradoId, processoId, cicloId, protocoloId.trim() || null);
      if ("error" in r) {
        onErro(r.error);
        return;
      }
      dialogRef.current?.close();
      onOk();
    });
  }

  return (
    <>
      <button type="button" onClick={abrir} className="text-petroleo-600 hover:underline dark:text-petroleo-400">
        Marcar como protocolado
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-0 text-nevoa-900 dark:text-nevoa-100 backdrop:bg-nevoa-900/40"
      >
        <div className="p-6 space-y-4 text-sm">
          <h3 className="font-title text-base font-semibold">Marcar Versão {versao} como protocolada</h3>

          {naoEhAMaisRecente && versaoMaisRecente && (
            <div className="flex items-start gap-2 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-3">
              <Selo variante="atencao">Não é a mais recente</Selo>
              <p className="text-nevoa-800 dark:text-nevoa-200">
                Existe a Versão {versaoMaisRecente.versao}, gerada em {dataHora(versaoMaisRecente.criadoEm)}.
                Protocolando a Versão {versao}, a conclusão vigente gravada será:{" "}
                {conclusaoVigenteTexto ? (
                  <>
                    <strong>&ldquo;{conclusaoVigenteTexto}&rdquo;</strong>
                  </>
                ) : (
                  "nenhuma — esta versão não altera a conclusão do laudo"
                )}
                .
              </p>
            </div>
          )}

          <p className="text-nevoa-700 dark:text-nevoa-300">
            Isto registra que a Versão {versao} — {nomeDocumento} — foi protocolada nos autos. A partir
            daqui o conteúdo dessa versão — arquivo, texto, título e numeração de páginas — fica{" "}
            <strong>congelado</strong>, e <strong>não há como desfazer</strong>: nem a marcação, nem o
            conteúdo. Só o número do protocolo pode ser corrigido depois.
          </p>
          {conclusaoVigenteTexto && (
            <p className="text-nevoa-700 dark:text-nevoa-300">
              Esta versão registra uma <strong>Nova Conclusão Vigente</strong> — ao protocolar, ela passa a
              valer para o processo.
            </p>
          )}
          <div>
            <label
              htmlFor={`protocolo-id-${laudoGeradoId}`}
              className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
            >
              Número do protocolo nos autos (opcional)
            </label>
            <input
              id={`protocolo-id-${laudoGeradoId}`}
              value={protocoloId}
              onChange={(e) => setProtocoloId(e.target.value)}
              placeholder="ex.: ID do protocolo / número da juntada"
              className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Botao variante="secundaria" onClick={() => dialogRef.current?.close()} disabled={isPending}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={confirmar} carregando={isPending} textoCarregando="Marcando…">
              Confirmar e congelar
            </Botao>
          </div>
        </div>
      </dialog>
    </>
  );
}
