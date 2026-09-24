"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarReplica } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { ReplicasRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Campos que NÃO vêm da Análise da Contestação (os "pontos que merecem
 * atenção" são lidos automaticamente de lá na hora de gerar o PDF).
 */
export function ReplicaPanel({ replica, temPontosSelecionados }: { replica: ReplicasRow; temPontosSelecionados: boolean }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarReplica(formData);
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Salvo." });
      router.refresh();
    });
  }

  return (
    <form
      action={salvar}
      className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4"
    >
      <input type="hidden" name="replica_id" value={replica.id} />
      <input type="hidden" name="processo_id" value={replica.processo_id} />

      {!temPontosSelecionados && (
        <p className="text-xs text-ambar-600 dark:text-ambar-400 rounded-md bg-ambar-100 dark:bg-ambar-950 px-3 py-2">
          Nenhum argumento da Análise da Contestação está marcado &ldquo;Incluir na Orientação para Réplica&rdquo; ainda —
          o documento sairá sem a seção de pontos de atenção.
        </p>
      )}

      <div>
        <label htmlFor="documentos_nao_considerados" className={labelClass}>
          Documentos não considerados/valorizados pela defesa (um por linha)
        </label>
        <textarea
          id="documentos_nao_considerados"
          name="documentos_nao_considerados"
          rows={3}
          defaultValue={replica.documentos_nao_considerados ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="pontos_preservados_pericia" className={labelClass}>
          Pontos que devem ser preservados para a prova pericial (um por linha)
        </label>
        <textarea
          id="pontos_preservados_pericia"
          name="pontos_preservados_pericia"
          rows={3}
          defaultValue={replica.pontos_preservados_pericia ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="conclusao_tecnica" className={labelClass}>
          Conclusão técnico-pericial
        </label>
        <textarea
          id="conclusao_tecnica"
          name="conclusao_tecnica"
          rows={3}
          defaultValue={replica.conclusao_tecnica ?? ""}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="local_emissao" className={labelClass}>
            Local de emissão
          </label>
          <input id="local_emissao" name="local_emissao" defaultValue={replica.local_emissao ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_emissao" className={labelClass}>
            Data de emissão
          </label>
          <input id="data_emissao" name="data_emissao" type="date" defaultValue={replica.data_emissao ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar
        </Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
