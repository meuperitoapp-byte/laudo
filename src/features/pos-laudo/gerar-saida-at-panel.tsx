"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarPosLaudoProtocolado, registrarEntregaAoAdvogado } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

export interface VersaoAtPosLaudo {
  id: string;
  versao: number;
  tipo: string;
  criadoEm: string;
  urlPdf: string | null;
  urlDocx: string | null;
  protocolado: boolean;
  protocoladoEm: string | null;
  protocoloId: string | null;
  entregueAoAdvogadoEm: string | null;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

function hojeIsoLocal(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/**
 * Painel de geração de uma saída de Assistência Técnica (parecer ou o
 * documento isolado de Quesitos Suplementares) — fatia 10c. Diferente de
 * `GerarPosLaudoPanel` (judicial) em dois pontos, refletindo a resposta (b)
 * da Dra. Fernanda: (1) opcionalmente mostra um seletor de modalidade
 * (`modalidades`, undefined = sem seletor, caso dos Quesitos); (2) o
 * documento NÃO é protocolado pelo sistema — entre "Gerar" e "Registrar
 * protocolo do patrono" existe o estado intermediário "Registrar entrega ao
 * advogado" (reversível, não congela nada). Regerar sempre SOBRESCREVE o
 * rascunho atual (mesma versão) enquanto não protocolado — não empilha
 * versão nova a cada clique.
 */
export function GerarSaidaAtPanel({
  processoId,
  cicloId,
  chave,
  nomeDocumento,
  tituloBotao,
  podeGerar,
  versoes,
  modalidades,
  gerar: gerarAcao,
}: {
  processoId: string;
  cicloId: string;
  chave: string;
  nomeDocumento: string;
  tituloBotao: string;
  podeGerar: boolean;
  versoes: VersaoAtPosLaudo[];
  /** Presente só no painel do parecer — a lista de modalidades pra escolher antes de gerar. */
  modalidades?: { valor: string; rotulo: string }[];
  gerar: (
    cicloId: string,
    processoId: string,
    dataAssinatura: string,
    modalidade: string | null,
  ) => Promise<{ error: string } | { success: true; versao: number }>;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dataAssinatura, setDataAssinatura] = useState(() => hojeIsoLocal());
  const [modalidade, setModalidade] = useState(modalidades?.[0]?.valor ?? "");

  // A dica sobre "sobrescreve x cria versão nova" depende do rascunho aberto
  // mais recente (não protocolado): sem entrega registrada ainda sobrescreve;
  // com entrega registrada, uma nova geração passa a criar versão nova (ver
  // gravarSaidaAtInPlace, actions.ts) — o que já saiu do escritório fica.
  const rascunhoAberto = versoes.filter((v) => !v.protocolado).sort((a, b) => b.versao - a.versao)[0] ?? null;

  function gerar() {
    setToast(null);
    startTransition(async () => {
      const resultado = await gerarAcao(cicloId, processoId, dataAssinatura, modalidades ? modalidade : null);
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
        {modalidades && (
          <div className="max-w-xs">
            <label
              htmlFor={`modalidade-${chave}`}
              className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
            >
              Modalidade
            </label>
            <select
              id={`modalidade-${chave}`}
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
            >
              {modalidades.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.rotulo}
                </option>
              ))}
            </select>
          </div>
        )}
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
        {rascunhoAberto && (
          <p className="text-xs text-nevoa-400 dark:text-nevoa-600 max-w-md">
            {rascunhoAberto.entregueAoAdvogadoEm
              ? `A Versão ${rascunhoAberto.versao} já foi entregue ao advogado — gerar de novo cria uma versão nova, sem apagar esta.`
              : "Ainda não há entrega registrada — gerar de novo substitui este rascunho, não cria uma versão nova a cada clique."}
          </p>
        )}
      </div>

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">
          {nomeDocumento}
        </h2>
        {versoes.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum rascunho gerado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-nevoa-900 dark:text-nevoa-100">Versão {v.versao}</span>
                  <span className="text-nevoa-500 dark:text-nevoa-400">{dataHora(v.criadoEm)}</span>
                  {v.protocolado ? (
                    <Selo variante="sucesso">
                      Protocolado pelo patrono{v.protocoladoEm ? ` em ${dataCurta(v.protocoladoEm)}` : ""}
                      {v.protocoloId ? ` · nº ${v.protocoloId}` : ""}
                    </Selo>
                  ) : v.entregueAoAdvogadoEm ? (
                    <Selo variante="atencao">Entregue ao advogado em {dataCurta(v.entregueAoAdvogadoEm)}</Selo>
                  ) : (
                    <Selo variante="neutro">Rascunho</Selo>
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
                    <EntregaEProtocoloAt
                      processoId={processoId}
                      cicloId={cicloId}
                      laudoGeradoId={v.id}
                      versao={v.versao}
                      nomeDocumento={nomeDocumento}
                      jaEntregue={Boolean(v.entregueAoAdvogadoEm)}
                      onErro={(texto) => setToast({ tipo: "erro", texto })}
                      onOk={(texto) => {
                        setToast({ tipo: "ok", texto });
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
 * As duas ações de estado de uma saída AT ainda não protocolada: "Registrar
 * entrega ao advogado" (reversível, botão direto) e "Registrar protocolo do
 * patrono" (irreversível, diálogo de confirmação — mesmo mecanismo de
 * congelamento do judicial, `marcarPosLaudoProtocolado`, mas com a redação
 * ajustada: aqui é um REGISTRO de algo que já aconteceu fora do sistema, não
 * um ato que a perita pratica).
 */
function EntregaEProtocoloAt({
  processoId,
  cicloId,
  laudoGeradoId,
  versao,
  nomeDocumento,
  jaEntregue,
  onOk,
  onErro,
}: {
  processoId: string;
  cicloId: string;
  laudoGeradoId: string;
  versao: number;
  nomeDocumento: string;
  jaEntregue: boolean;
  onOk: (texto: string) => void;
  onErro: (texto: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [protocoloId, setProtocoloId] = useState("");
  const [isPendingEntrega, startEntrega] = useTransition();
  const [isPendingProtocolo, startProtocolo] = useTransition();

  function entregar() {
    startEntrega(async () => {
      const r = await registrarEntregaAoAdvogado(laudoGeradoId, processoId, cicloId);
      if ("error" in r) {
        onErro(r.error);
        return;
      }
      onOk(`Versão ${versao} marcada como entregue ao advogado.`);
    });
  }

  function abrirProtocolo() {
    setProtocoloId("");
    dialogRef.current?.showModal();
  }

  function confirmarProtocolo() {
    startProtocolo(async () => {
      const r = await marcarPosLaudoProtocolado(laudoGeradoId, processoId, cicloId, protocoloId.trim() || null);
      if ("error" in r) {
        onErro(r.error);
        return;
      }
      dialogRef.current?.close();
      onOk(`Versão ${versao} marcada como protocolada pelo patrono.`);
    });
  }

  return (
    <>
      {!jaEntregue && (
        <button
          type="button"
          onClick={entregar}
          disabled={isPendingEntrega}
          className="text-petroleo-600 hover:underline dark:text-petroleo-400 disabled:opacity-40"
        >
          Registrar entrega ao advogado
        </button>
      )}
      <button type="button" onClick={abrirProtocolo} className="text-petroleo-600 hover:underline dark:text-petroleo-400">
        Registrar protocolo do patrono
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-0 text-nevoa-900 dark:text-nevoa-100 backdrop:bg-nevoa-900/40"
      >
        <div className="p-6 space-y-4 text-sm">
          <h3 className="font-title text-base font-semibold">Registrar protocolo da Versão {versao}</h3>
          <p className="text-nevoa-700 dark:text-nevoa-300">
            Use esta opção quando o(a) advogado(a) confirmar que já protocolou a Versão {versao} —{" "}
            {nomeDocumento} — nos autos. A partir daqui o conteúdo dessa versão fica{" "}
            <strong>congelado</strong>, e <strong>não há como desfazer</strong>: se for preciso mudar algo
            depois, será uma versão nova.
          </p>
          <div>
            <label
              htmlFor={`protocolo-id-at-${laudoGeradoId}`}
              className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
            >
              Número do protocolo nos autos (opcional)
            </label>
            <input
              id={`protocolo-id-at-${laudoGeradoId}`}
              value={protocoloId}
              onChange={(e) => setProtocoloId(e.target.value)}
              placeholder="ex.: ID do protocolo / número da juntada"
              className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Botao variante="secundaria" onClick={() => dialogRef.current?.close()} disabled={isPendingProtocolo}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={confirmarProtocolo} carregando={isPendingProtocolo} textoCarregando="Registrando…">
              Confirmar e congelar
            </Botao>
          </div>
        </div>
      </dialog>
    </>
  );
}
