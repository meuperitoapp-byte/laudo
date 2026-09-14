"use client";

import { useRef, useState, useTransition } from "react";
import { excluirProcesso } from "./actions";
import { Botao } from "@/components/ui/button";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

/**
 * Exclusão real e definitiva de um processo — sem desfazer. O cascade já
 * configurado no banco cuida de documentos/respostas/laudos gerados/ciclos
 * de pós-laudo/partes; a action limpa os arquivos do Storage antes de
 * apagar a linha. Confirmação por digitação (não só um clique) porque,
 * diferente de "marcar protocolado" (que pelo menos preserva o conteúdo),
 * aqui não sobra nada pra corrigir depois.
 */
export function ExcluirProcessoButton({ processoId }: { processoId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function abrir() {
    setConfirmacao("");
    setErro(null);
    dialogRef.current?.showModal();
  }

  function confirmar() {
    startTransition(async () => {
      const r = await excluirProcesso(processoId);
      if (r && "error" in r) {
        setErro(r.error);
      }
      // Sucesso redireciona pra /processos dentro da própria action.
    });
  }

  const podeConfirmar = confirmacao.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="text-sm text-vinho-600 hover:underline dark:text-vinho-400"
      >
        Excluir processo
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-0 text-nevoa-900 dark:text-nevoa-100 backdrop:bg-nevoa-900/40"
      >
        <div className="p-6 space-y-4 text-sm">
          <h3 className="font-title text-base font-semibold text-vinho-700 dark:text-vinho-400">
            Excluir processo definitivamente
          </h3>
          <p className="text-nevoa-700 dark:text-nevoa-300">
            Isto apaga o processo e tudo o que está ligado a ele — documentos anexados, laudos e pareceres
            gerados (PDF e Word), respostas do formulário, quesitos e todo o histórico de pós-laudo.{" "}
            <strong>Não há como desfazer.</strong>
          </p>
          <div>
            <label
              htmlFor="confirmacao_exclusao"
              className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1"
            >
              Digite <strong>{PALAVRA_CONFIRMACAO}</strong> para confirmar
            </label>
            <input
              id="confirmacao_exclusao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
            />
          </div>
          {erro && <p className="text-vinho-600 dark:text-vinho-400">{erro}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Botao variante="secundaria" onClick={() => dialogRef.current?.close()} disabled={isPending}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={confirmar}
              disabled={!podeConfirmar || isPending}
              carregando={isPending}
              textoCarregando="Excluindo…"
            >
              Excluir definitivamente
            </Botao>
          </div>
        </div>
      </dialog>
    </>
  );
}
