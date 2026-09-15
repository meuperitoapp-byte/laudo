"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarDocumentosSolicitados } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const hojeIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/**
 * Estado do caso, não do formulário do processo — convive com qualquer
 * `situacao_processo`. `documentos_solicitados_em` some da Central de Prazos
 * assim que ela marca como recebido (limpa os dois campos juntos).
 */
export function DocumentosPendentesPanel({
  processoId,
  solicitadoEm,
  descricao,
}: {
  processoId: string;
  solicitadoEm: string | null;
  descricao: string | null;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [f, setF] = useState({ data: hojeIso(), descricao: "" });

  async function marcarSolicitado() {
    setIsPending(true);
    const r = await salvarDocumentosSolicitados(processoId, f.data || hojeIso(), f.descricao.trim() || null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Documentos pendentes registrados." });
    router.refresh();
  }

  async function marcarRecebido() {
    setIsPending(true);
    const r = await salvarDocumentosSolicitados(processoId, null, null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Documentos marcados como recebidos." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Documentos pendentes</h3>

      {solicitadoEm ? (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 flex flex-wrap items-center gap-2">
            <Selo variante="atencao">Solicitado em {dataCurta(solicitadoEm)}</Selo>
          </p>
          {descricao && <p className="text-sm text-nevoa-700 dark:text-nevoa-300">{descricao}</p>}
          <Botao
            variante="secundaria"
            onClick={() => marcarRecebido()}
            disabled={isPending}
            carregando={isPending}
            textoCarregando="Salvando…"
          >
            Marcar como recebido
          </Botao>
        </>
      ) : (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Preencha quando pedir algo ao advogado/parte — some sozinho da Central de Prazos quando você marcar
            como recebido.
          </p>
          <div>
            <label htmlFor="documentos_solicitados_data" className={labelClass}>
              Data da solicitação
            </label>
            <input
              id="documentos_solicitados_data"
              type="date"
              value={f.data}
              onChange={(e) => setF({ ...f, data: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="documentos_solicitados_descricao" className={labelClass}>
              O que foi pedido
            </label>
            <input
              id="documentos_solicitados_descricao"
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="Ex.: exames de imagem atualizados"
              className={inputClass}
            />
          </div>
          <Botao onClick={() => marcarSolicitado()} disabled={isPending} carregando={isPending} textoCarregando="Salvando…">
            Marcar como solicitado
          </Botao>
        </>
      )}

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
