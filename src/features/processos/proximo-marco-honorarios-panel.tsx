"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarProximoMarcoHonorarios } from "./actions";
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
 * Só Perícia Judicial. Guarda sempre o PRÓXIMO marco de pagamento que falta
 * — nunca um histórico dos já resolvidos, e nunca calculado pelo sistema
 * (não existe fórmula de parcelamento judicial, quem determina é o juiz).
 * Rótulo diz "próximo" de propósito: pode existir mais de um marco ao longo
 * do mesmo processo (ex.: entrada, depois saldo na entrega) — ela limpa e
 * preenche de novo quando o marco atual é resolvido e surge o seguinte.
 * Mesmo padrão de estado-do-caso do DocumentosPendentesPanel.
 */
export function ProximoMarcoHonorariosPanel({
  processoId,
  marcoEm,
  descricao,
}: {
  processoId: string;
  marcoEm: string | null;
  descricao: string | null;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [f, setF] = useState({ data: hojeIso(), descricao: "" });

  async function marcarCombinado() {
    setIsPending(true);
    const r = await salvarProximoMarcoHonorarios(processoId, f.data || hojeIso(), f.descricao.trim() || null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Próximo marco registrado." });
    router.refresh();
  }

  async function marcarResolvido() {
    setIsPending(true);
    const r = await salvarProximoMarcoHonorarios(processoId, null, null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Marco resolvido." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Próximo marco de honorários</h3>

      {marcoEm ? (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 flex flex-wrap items-center gap-2">
            <Selo variante="atencao">Combinado para {dataCurta(marcoEm)}</Selo>
          </p>
          {descricao && <p className="text-sm text-nevoa-700 dark:text-nevoa-300">{descricao}</p>}
          <Botao
            variante="secundaria"
            onClick={() => marcarResolvido()}
            disabled={isPending}
            carregando={isPending}
            textoCarregando="Salvando…"
          >
            Marcar como resolvido
          </Botao>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Se surgir um novo marco depois deste, resolva o atual e cadastre o próximo.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Preencha só se combinou uma próxima data de pagamento para este processo (ex.: &ldquo;saldo na entrega
            do laudo, combinado pra 10/10&rdquo;). Não existe cálculo automático — quem determina é o juízo.
          </p>
          <div>
            <label htmlFor="proximo_marco_data" className={labelClass}>
              Data do próximo marco
            </label>
            <input
              id="proximo_marco_data"
              type="date"
              value={f.data}
              onChange={(e) => setF({ ...f, data: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="proximo_marco_descricao" className={labelClass}>
              O que é este marco
            </label>
            <input
              id="proximo_marco_descricao"
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="Ex.: saldo na entrega do laudo"
              className={inputClass}
            />
          </div>
          <Botao onClick={() => marcarCombinado()} disabled={isPending} carregando={isPending} textoCarregando="Salvando…">
            Registrar próximo marco
          </Botao>
        </>
      )}

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
