"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarLaudo, marcarLaudoProtocolado } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

export interface VersaoLaudo {
  id: string;
  versao: number;
  tipo: string;
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

/**
 * Esta lista mistura o laudo principal com as saídas do Módulo Pós-Laudo
 * (mesma `laudos_gerados`, ver migration 20260905120000) — sem rótulo, "Versão
 * 2" sozinho não diz se é uma nova versão do laudo ou um documento de
 * Esclarecimentos gerado num ciclo. Só rotula quando não é o laudo principal;
 * a linha do tempo unificada de verdade fica pra fatia 12.
 */
const TIPO_ROTULOS: Record<string, string> = {
  esclarecimentos: "Esclarecimentos",
  retificacao: "Retificação de Erro Material",
  complementacao: "Complementação do Laudo",
  parecer_at: "Parecer Técnico",
  manifestacao_at: "Manifestação (AT)",
  impugnacao_at: "Impugnação (AT)",
  parecer_divergente_at: "Parecer Divergente (AT)",
};

export function GerarLaudoPanel({
  processoId,
  podeGerar,
  versoes,
}: {
  processoId: string;
  podeGerar: boolean;
  versoes: VersaoLaudo[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarLaudo(processoId);
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
      <div>
        <Botao onClick={gerar} disabled={!podeGerar} carregando={isPending} textoCarregando="Gerando…">
          Gerar novo laudo
        </Botao>
      </div>

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">Versões geradas</h2>
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
                  {v.tipo !== "laudo" && <Selo variante="neutro">{TIPO_ROTULOS[v.tipo] ?? v.tipo}</Selo>}
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
                  {v.tipo === "laudo" && !v.protocolado && (
                    <MarcarProtocoladoAcao
                      processoId={processoId}
                      laudoGeradoId={v.id}
                      versao={v.versao}
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
 * Botão + diálogo de confirmação para marcar uma versão do laudo como
 * protocolada. Não é clique direto: é ação irreversível (o trigger do banco
 * congela o conteúdo daquela versão e não deixa des-protocolar), então o
 * diálogo explica o que acontece e recebe o nº do protocolo antes de confirmar.
 */
function MarcarProtocoladoAcao({
  processoId,
  laudoGeradoId,
  versao,
  onOk,
  onErro,
}: {
  processoId: string;
  laudoGeradoId: string;
  versao: number;
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
      const r = await marcarLaudoProtocolado(laudoGeradoId, processoId, protocoloId.trim() || null);
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
      <button
        type="button"
        onClick={abrir}
        className="text-petroleo-600 hover:underline dark:text-petroleo-400"
      >
        Marcar como protocolado
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-0 text-nevoa-900 dark:text-nevoa-100 backdrop:bg-nevoa-900/40"
      >
        <div className="p-6 space-y-4 text-sm">
          <h3 className="font-title text-base font-semibold">Marcar Versão {versao} como protocolada</h3>
          <p className="text-nevoa-700 dark:text-nevoa-300">
            Isto registra que a Versão {versao} do laudo foi protocolada nos autos. A partir daqui o
            conteúdo dessa versão — arquivo, texto, título e numeração de páginas — fica{" "}
            <strong>congelado</strong>, e <strong>não há como desfazer</strong>: nem a marcação, nem o
            conteúdo. Só o número do protocolo pode ser corrigido depois.
          </p>
          <p className="text-nevoa-700 dark:text-nevoa-300">
            Marcar o laudo como protocolado é o que libera a aba <strong>Pós-laudo</strong> deste
            processo.
          </p>
          <div>
            <label
              htmlFor="protocolo-id"
              className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
            >
              Número do protocolo nos autos (opcional)
            </label>
            <input
              id="protocolo-id"
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
