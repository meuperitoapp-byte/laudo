"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarReuniaoEstrategiaPericial } from "./actions";
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

/**
 * Etapa "Estratégia pericial" (Assistência Técnica) — item 2 do lote
 * pós-Fase-2 (21/09/2026): a secretária marca com o advogado a data da
 * reunião de explicações técnicas. Mesmo padrão de estado-do-caso do
 * DocumentosPendentesPanel/ProximoMarcoHonorariosPanel — preenchido/limpo
 * manualmente, sem prazo/lembrete associado (não é algo que vence).
 *
 * Feedback da Dra. Fernanda (24/09/2026): quem marca a data é a Patrícia,
 * DEPOIS de combinar com o advogado — o campo não pode vir pré-preenchido
 * com a data de hoje (senão parece já marcada). Responsável também deixou de
 * ser texto livre — vira os nomes dos logins já criados.
 */
export function ReuniaoEstrategiaPericialPanel({
  processoId,
  reuniaoEm,
  responsavel,
  nomesResponsaveis,
}: {
  processoId: string;
  reuniaoEm: string | null;
  responsavel: string | null;
  nomesResponsaveis: string[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState("");
  const [resp, setResp] = useState(responsavel ?? "");

  async function marcarReuniao() {
    if (!data) {
      setMensagem({ tipo: "erro", texto: "Informe a data combinada com o advogado." });
      return;
    }
    setIsPending(true);
    const r = await salvarReuniaoEstrategiaPericial(processoId, data, resp.trim() || null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Reunião registrada." });
    router.refresh();
  }

  async function limparReuniao() {
    setIsPending(true);
    const r = await salvarReuniaoEstrategiaPericial(processoId, null, null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Reunião removida." });
    router.refresh();
  }

  return (
    <div
      id="reuniao-estrategia-pericial"
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4 scroll-mt-20"
    >
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Reunião — Estratégia pericial
      </h3>

      {reuniaoEm ? (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 flex flex-wrap items-center gap-2">
            <Selo variante="sucesso">Marcada para {dataCurta(reuniaoEm)}</Selo>
            {responsavel && <span>Responsável: {responsavel}</span>}
          </p>
          <Botao
            variante="secundaria"
            onClick={() => limparReuniao()}
            disabled={isPending}
            carregando={isPending}
            textoCarregando="Salvando…"
          >
            Remover data
          </Botao>
        </>
      ) : (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Preencha quando combinar com o advogado a reunião de explicações técnicas.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="reuniao_estrategia_data" className={labelClass}>
                Data da reunião
              </label>
              <input
                id="reuniao_estrategia_data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="reuniao_estrategia_responsavel" className={labelClass}>
                Responsável
              </label>
              <select
                id="reuniao_estrategia_responsavel"
                value={resp}
                onChange={(e) => setResp(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione…</option>
                {nomesResponsaveis.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Preenchendo o responsável, esse compromisso aparece na Agenda/tela de atividades dele.
          </p>
          <Botao onClick={() => marcarReuniao()} disabled={isPending} carregando={isPending} textoCarregando="Salvando…">
            Marcar reunião
          </Botao>
        </>
      )}

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
