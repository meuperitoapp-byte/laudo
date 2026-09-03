"use client";

import { useState, useTransition } from "react";
import { abrirCicloPosLaudo } from "./actions";
import { Botao } from "@/components/ui/button";

/**
 * Botão "Abrir novo ciclo de pós-laudo". A dedup (se já existe um ciclo aberto
 * em branco, vai pra ele em vez de criar outro) e o redirecionamento pra tela
 * do ciclo vivem na server action — aqui só mostra erro se voltar erro.
 */
export function AbrirCicloButton({ processoId }: { processoId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function abrir() {
    setErro(null);
    startTransition(async () => {
      const r = await abrirCicloPosLaudo(processoId);
      if (r && "error" in r) setErro(r.error);
      // sucesso: a action redireciona pra /processos/[id]/pos-laudo/[cicloId]
    });
  }

  return (
    <div className="space-y-2">
      <Botao onClick={abrir} carregando={isPending} textoCarregando="Abrindo…">
        Abrir novo ciclo de pós-laudo
      </Botao>
      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
