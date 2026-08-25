"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarQuesito, criarQuesito, excluirQuesito, moverQuesito } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { QuesitosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

// Texto padrão pra quando não há elementos médico-periciais objetivos
// suficientes pra responder objetivamente (CLAUDE.md: a resposta não pode
// ser forçada — o texto livre justificando entra no lugar dela).
const TEXTO_SEM_ELEMENTOS =
  "Não há elementos médico-periciais objetivos suficientes para resposta conclusiva...";

export function QuesitosPanel({
  processoId,
  quesitos,
}: {
  processoId: string;
  quesitos: QuesitosRow[];
}) {
  return (
    <div className="space-y-8 max-w-3xl">
      {quesitos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum quesito cadastrado ainda.</p>
      ) : (
        <ol className="space-y-4">
          {quesitos.map((quesito, index) => (
            <QuesitoCard
              key={quesito.id}
              processoId={processoId}
              quesito={quesito}
              numero={index + 1}
              primeiro={index === 0}
              ultimo={index === quesitos.length - 1}
            />
          ))}
        </ol>
      )}

      <NovoQuesitoForm processoId={processoId} />
    </div>
  );
}

function QuesitoCard({
  processoId,
  quesito,
  numero,
  primeiro,
  ultimo,
}: {
  processoId: string;
  quesito: QuesitosRow;
  numero: number;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const router = useRouter();
  const [origem, setOrigem] = useState(quesito.origem ?? "");
  const [pergunta, setPergunta] = useState(quesito.pergunta);
  const [resposta, setResposta] = useState(quesito.resposta ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const alterado = origem !== (quesito.origem ?? "") || pergunta !== quesito.pergunta || resposta !== (quesito.resposta ?? "");

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarQuesito({
        quesitoId: quesito.id,
        processoId,
        origem: origem || null,
        pergunta,
        resposta: resposta || null,
      });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function mover(direcao: "cima" | "baixo") {
    setErro(null);
    startTransition(async () => {
      const resultado = await moverQuesito({ processoId, quesitoId: quesito.id, direcao });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm("Excluir este quesito? Não tem como desfazer.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirQuesito(quesito.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mt-1.5">Quesito {numero}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => mover("cima")}
            disabled={primeiro || isPending}
            title="Mover para cima"
            aria-label="Mover quesito para cima"
            className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 w-7 h-7 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => mover("baixo")}
            disabled={ultimo || isPending}
            title="Mover para baixo"
            aria-label="Mover quesito para baixo"
            className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 w-7 h-7 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={isPending}
            title="Excluir quesito"
            aria-label="Excluir quesito"
            className="rounded-md border border-nevoa-300 dark:border-nevoa-700 w-7 h-7 text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Origem</label>
        <input
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          placeholder="ex.: Juízo, Parte Autora, Parte Ré, Ministério Público..."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Pergunta</label>
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Resposta</label>
          <button
            type="button"
            onClick={() => setResposta(TEXTO_SEM_ELEMENTOS)}
            className="text-xs text-petroleo-600 hover:underline dark:text-petroleo-400"
          >
            Sem elementos suficientes
          </button>
        </div>
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={3}
          placeholder="Resposta objetiva — ou a justificativa, se não houver elementos suficientes pra concluir"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <Botao
          onClick={salvar}
          disabled={!alterado && !isPending}
          carregando={isPending}
          textoCarregando="Salvando…"
        >
          {alterado ? "Salvar" : "Salvo"}
        </Botao>
        {!quesito.resposta?.trim() && !alterado && <Selo variante="atencao">Sem resposta ainda</Selo>}
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </li>
  );
}

function NovoQuesitoForm({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarQuesito(processoId, formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-novo-quesito") as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id="form-novo-quesito"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3"
    >
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Adicionar quesito</h2>
      <div>
        <label htmlFor="origem" className={labelClass}>
          Origem
        </label>
        <input
          id="origem"
          name="origem"
          placeholder="ex.: Juízo, Parte Autora, Parte Ré, Ministério Público..."
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="pergunta" className={labelClass}>
          Pergunta
        </label>
        <textarea id="pergunta" name="pergunta" rows={3} placeholder="Cole aqui o texto do quesito" className={inputClass} />
      </div>
      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}
      <Botao type="submit" carregando={isPending} textoCarregando="Adicionando…">
        Adicionar quesito
      </Botao>
    </form>
  );
}
