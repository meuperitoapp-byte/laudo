"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adicionarQuesitoCiclo, removerQuesitoCiclo, salvarQuesitoCiclo } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { QUESITO_ORIGEM_ORDENADA, QUESITO_ORIGEM_ROTULOS, QUESITO_TIPO_ROTULOS } from "./rotulos";
import type { PosLaudoQuesitosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Quesitos suplementares do ciclo (fatia 9). Ficam SÓ dentro do ciclo de
 * pós-laudo — nunca entram na aba Quesitos do laudo (Dra. confirmou). A
 * numeração reinicia do 1 a cada ciclo. Entram na seção V dos Esclarecimentos
 * / VIII da Complementação quando existirem; a seção some quando não há
 * nenhum. O texto do quesito fica editável até a geração (o snapshot do
 * documento gerado é que congela).
 */
export function QuesitosCicloPanel({
  processoId,
  cicloId,
  quesitos,
}: {
  processoId: string;
  cicloId: string;
  quesitos: PosLaudoQuesitosRow[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  async function novoQuesito() {
    setAdicionando(true);
    setMensagem(null);
    const r = await adicionarQuesitoCiclo(cicloId, processoId);
    setAdicionando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    router.refresh();
  }

  return (
    <div id="quesitos-ciclo" className="space-y-4 max-w-2xl scroll-mt-24">
      <div>
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">
          Quesitos suplementares do ciclo
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          Ficam só nesta rodada — não entram na aba Quesitos do laudo. A numeração recomeça do 1 a
          cada ciclo. Entram na seção de respostas aos quesitos do documento gerado (Esclarecimentos
          ou Complementação) quando existirem.
        </p>
      </div>

      {quesitos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          Nenhum quesito nesta rodada. Adicione um para cada pergunta suplementar apresentada nos
          autos.
        </p>
      ) : (
        <ol className="space-y-4">
          {quesitos.map((q, i) => (
            <QuesitoCard
              key={q.id}
              numero={i + 1}
              processoId={processoId}
              cicloId={cicloId}
              quesito={q}
              onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
              onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
            />
          ))}
        </ol>
      )}

      <Botao onClick={novoQuesito} carregando={adicionando} textoCarregando="Adicionando…">
        Adicionar quesito
      </Botao>

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}

function QuesitoCard({
  numero,
  processoId,
  cicloId,
  quesito,
  onErro,
  onOk,
}: {
  numero: number;
  processoId: string;
  cicloId: string;
  quesito: PosLaudoQuesitosRow;
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const doBanco = {
    origem: quesito.origem ?? "",
    tipo: quesito.tipo,
    pergunta: quesito.pergunta,
    resposta: quesito.resposta ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(quesito);
  if (quesito !== sync && !dirty && !salvando) {
    setSync(quesito);
    setF(doBanco);
    setSalvoSnap(JSON.stringify(doBanco));
  }

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const incompleto = !f.pergunta.trim() || !f.resposta.trim();

  async function salvar() {
    setSalvando(true);
    const r = await salvarQuesitoCiclo({
      quesitoId: quesito.id,
      cicloId,
      processoId,
      origem: f.origem || null,
      tipo: f.tipo,
      pergunta: f.pergunta,
      resposta: f.resposta || null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    onOk(`Quesito ${numero} salvo.`);
    router.refresh();
  }

  async function remover() {
    if (!window.confirm(`Remover o quesito ${numero}? Não tem como desfazer.`)) return;
    setRemovendo(true);
    const r = await removerQuesitoCiclo(quesito.id, cicloId, processoId);
    setRemovendo(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <li
      id={`quesito-${quesito.id}`}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3 scroll-mt-24"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
          Quesito {numero}
          {incompleto && <Selo variante="atencao">Incompleto</Selo>}
        </span>
        <button
          type="button"
          onClick={remover}
          disabled={removendo || salvando}
          className="text-xs text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
        >
          Remover quesito
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Origem</label>
          <select value={f.origem} onChange={(e) => set("origem", e.target.value)} className={inputClass}>
            <option value="">—</option>
            {QUESITO_ORIGEM_ORDENADA.map((o) => (
              <option key={o} value={o}>
                {QUESITO_ORIGEM_ROTULOS[o]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tipo</label>
          <select value={f.tipo} onChange={(e) => set("tipo", e.target.value as typeof f.tipo)} className={inputClass}>
            {(["suplementar", "esclarecimento"] as const).map((t) => (
              <option key={t} value={t}>
                {QUESITO_TIPO_ROTULOS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Pergunta (transcrição do quesito, como consta nos autos)</label>
        <textarea value={f.pergunta} onChange={(e) => set("pergunta", e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Resposta</label>
        <textarea value={f.resposta} onChange={(e) => set("resposta", e.target.value)} rows={3} className={inputClass} />
      </div>

      <div className="pt-1">
        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar quesito" : "Quesito salvo"}
        </Botao>
      </div>
    </li>
  );
}
