"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarFluxoPrincipalProtocolado } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import type { LaudoGeradoTipo } from "@/types/enums";

export interface VersaoDocumento {
  id: string;
  versao: number;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
  protocolado: boolean;
  protocoladoEm: string | null;
  protocoloId: string | null;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

function hojeIsoLocal(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/**
 * Painel de geração de um documento do Fluxo Principal (Aceite/Depósito/
 * Agendamento) — mesmo padrão visual de `pos-laudo/GerarPosLaudoPanel`, sem
 * ciclo nem Nova Conclusão Vigente (documentos de processo, não de ciclo de
 * pós-laudo). `gerar` já vem fechado por quem chama com qualquer flag extra
 * do próprio documento (confirmação de dados bancários, confirmação do
 * alerta de agendamento) — este painel só cuida de disparar, listar versões
 * e protocolar.
 */
export function GerarDocumentoPanel({
  processoId,
  tipo,
  chave,
  nomeDocumento,
  tituloBotao,
  podeGerar,
  avisoBloqueio,
  versoes,
  gerar: gerarAcao,
  extra,
}: {
  processoId: string;
  tipo: LaudoGeradoTipo;
  chave: string;
  nomeDocumento: string;
  tituloBotao: string;
  podeGerar: boolean;
  /** Explica por que `podeGerar` é false (ex.: trava do Aceite) — some quando podeGerar é true. */
  avisoBloqueio?: string | null;
  versoes: VersaoDocumento[];
  gerar: (dataAssinatura: string) => Promise<{ error: string } | { success: true; versao: number }>;
  /** Controle extra específico do documento (ex.: checkbox de dados bancários), renderizado acima do botão. */
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dataAssinatura, setDataAssinatura] = useState(() => hojeIsoLocal());

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarAcao(dataAssinatura);
      if ("error" in resultado) {
        setToast({ tipo: "erro", texto: resultado.error });
        return;
      }
      setToast({ tipo: "ok", texto: `Versão ${resultado.versao} gerada.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {avisoBloqueio && !podeGerar && (
        <div className="rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-3 text-sm text-nevoa-800 dark:text-nevoa-200">
          {avisoBloqueio}
        </div>
      )}

      <div className="space-y-3">
        {extra}
        <div className="max-w-xs">
          <label
            htmlFor={`data-assinatura-${chave}`}
            className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
          >
            Data da assinatura
          </label>
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
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">
          Versões geradas
        </h3>
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
                      tipo={tipo}
                      laudoGeradoId={v.id}
                      versao={v.versao}
                      nomeDocumento={nomeDocumento}
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

function MarcarProtocoladoAcao({
  processoId,
  tipo,
  laudoGeradoId,
  versao,
  nomeDocumento,
  onOk,
  onErro,
}: {
  processoId: string;
  tipo: LaudoGeradoTipo;
  laudoGeradoId: string;
  versao: number;
  nomeDocumento: string;
  onOk: () => void;
  onErro: (texto: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [protocoloId, setProtocoloId] = useState("");
  const [isPending, startTransition] = useTransition();

  function abrir() {
    setProtocoloId("");
    dialogRef.current?.showModal();
  }

  function confirmar() {
    startTransition(async () => {
      const r = await marcarFluxoPrincipalProtocolado(laudoGeradoId, processoId, tipo, protocoloId.trim() || null);
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
          <p className="text-nevoa-700 dark:text-nevoa-300">
            Isto registra que a Versão {versao} — {nomeDocumento} — foi protocolada nos autos. A partir
            daqui o conteúdo dessa versão fica <strong>congelado</strong>, e <strong>não há como desfazer</strong>:
            nem a marcação, nem o conteúdo. Só o número do protocolo pode ser corrigido depois.
          </p>
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
