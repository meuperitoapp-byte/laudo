"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encerrarReuniaoEstrategiaPericial, salvarReuniaoEstrategiaPericial } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import type { ReunioesEstrategiaHistoricoRow, ReuniaoEstrategiaSituacao } from "@/types/database";

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
 *
 * Horário (lote 15/10/2026): opcional, vai junto pra Agenda — antes ela
 * precisava criar outro agendamento com horário, e a reunião ficava
 * duplicada.
 */
export function ReuniaoEstrategiaPericialPanel({
  processoId,
  reuniaoEm,
  reuniaoHora,
  responsavel,
  nomesResponsaveis,
  historico,
}: {
  processoId: string;
  reuniaoEm: string | null;
  /** "HH:MM:SS" do banco, ou null (reunião marcada antes de existir o campo, ou sem horário). */
  reuniaoHora: string | null;
  responsavel: string | null;
  nomesResponsaveis: string[];
  /** Reuniões já encerradas (realizada/cancelada), mais recentes primeiro. */
  historico: ReunioesEstrategiaHistoricoRow[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  // Reunião já marcada: "Editar data" abre data/horário/responsável preenchidos.
  const [editando, setEditando] = useState(false);
  const [resp, setResp] = useState(responsavel ?? "");

  async function marcarReuniao() {
    if (!data) {
      setMensagem({ tipo: "erro", texto: "Informe a data combinada com o advogado." });
      return;
    }
    setIsPending(true);
    const r = await salvarReuniaoEstrategiaPericial(processoId, data, resp.trim() || null, hora || null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Reunião registrada." });
    router.refresh();
  }

  function abrirEdicao() {
    setData(reuniaoEm ?? "");
    setHora(reuniaoHora ? reuniaoHora.slice(0, 5) : "");
    setResp(responsavel ?? "");
    setEditando(true);
  }

  async function salvarEdicao() {
    if (!data) {
      setMensagem({ tipo: "erro", texto: "Informe a data da reunião." });
      return;
    }
    setIsPending(true);
    const r = await salvarReuniaoEstrategiaPericial(processoId, data, resp.trim() || null, hora || null);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setEditando(false);
    setMensagem({ tipo: "ok", texto: "Reunião atualizada." });
    router.refresh();
  }

  async function encerrar(situacao: ReuniaoEstrategiaSituacao) {
    const rotulo = situacao === "realizada" ? "realizada" : "cancelada";
    if (!window.confirm(`Marcar a reunião como ${rotulo}? Ela sai de "O que cumprir" e fica no histórico.`)) return;
    setIsPending(true);
    const r = await encerrarReuniaoEstrategiaPericial(processoId, situacao);
    setIsPending(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    // O formulário de nova reunião não herda a data da anterior.
    setData("");
    setHora("");
    setResp("");
    setMensagem({ tipo: "ok", texto: `Reunião registrada como ${rotulo}.` });
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
            <Selo variante="sucesso">
              Marcada para {dataCurta(reuniaoEm)}
              {reuniaoHora ? ` às ${reuniaoHora.slice(0, 5)}` : ""}
            </Selo>
            {responsavel && <span>Responsável: {responsavel}</span>}
          </p>
          {editando ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="reuniao_estrategia_data_edicao" className={labelClass}>
                    Data da reunião
                  </label>
                  <input
                    id="reuniao_estrategia_data_edicao"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reuniao_estrategia_hora_edicao" className={labelClass}>
                    Horário
                  </label>
                  <input
                    id="reuniao_estrategia_hora_edicao"
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reuniao_estrategia_responsavel_edicao" className={labelClass}>
                    Responsável
                  </label>
                  <select
                    id="reuniao_estrategia_responsavel_edicao"
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
              <div className="flex flex-wrap items-center gap-3">
                <Botao onClick={() => salvarEdicao()} disabled={isPending} carregando={isPending} textoCarregando="Salvando…">
                  Salvar
                </Botao>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Botao variante="secundaria" onClick={abrirEdicao} disabled={isPending}>
                Editar data
              </Botao>
              <Botao variante="secundaria" onClick={() => encerrar("realizada")} disabled={isPending}>
                Realizada
              </Botao>
              <Botao variante="secundaria" onClick={() => encerrar("cancelada")} disabled={isPending}>
                Cancelada
              </Botao>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Preencha quando combinar com o advogado a reunião de explicações técnicas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label htmlFor="reuniao_estrategia_hora" className={labelClass}>
                Horário
              </label>
              <input
                id="reuniao_estrategia_hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
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

      {historico.length > 0 && (
        <div className="space-y-1.5 border-t border-nevoa-200 dark:border-nevoa-800 pt-3">
          <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400">Histórico</p>
          <ul className="space-y-1">
            {historico.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 text-xs text-nevoa-600 dark:text-nevoa-400">
                <Selo variante={h.situacao === "realizada" ? "sucesso" : "neutro"}>
                  {h.situacao === "realizada" ? "Realizada" : "Cancelada"}
                </Selo>
                <span>
                  {dataCurta(h.data)}
                  {h.hora ? ` às ${h.hora.slice(0, 5)}` : ""}
                  {h.responsavel ? ` · ${h.responsavel}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}
