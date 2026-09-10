"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarRegistroDemandaAt } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  CLASSIFICACAO_GLOBAL_ORDENADA,
  CLASSIFICACAO_GLOBAL_ROTULOS,
  PROVIDENCIA_AT_ORDENADA,
  PROVIDENCIA_AT_ROTULOS,
} from "./rotulos";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

export interface RegistroAt {
  objeto_analise: string | null;
  tese_assistida: string | null;
  classificacao_global: string | null;
  providencia_recomendada: string[] | null;
  posicao_pericons_sintese: string | null;
}

/**
 * Bloco de Assistência Técnica do Registro da Demanda — o que o RegistroDemandaForm
 * (comum aos dois fluxos) não cobre: objeto da análise, tese da parte assistida,
 * classificação global do laudo do perito judicial (obrigatória no AT — cobrada
 * na geração, não aqui), providência recomendada e a posição da PERICONS sobre o
 * laudo (entra verbatim no documento; sem log versionado).
 */
export function RegistroDemandaAt({
  processoId,
  cicloId,
  registro,
}: {
  processoId: string;
  cicloId: string;
  registro: RegistroAt;
}) {
  const router = useRouter();

  const doBanco = {
    objeto: registro.objeto_analise ?? "",
    tese: registro.tese_assistida ?? "",
    classificacao: registro.classificacao_global ?? "",
    providencia: registro.providencia_recomendada ?? [],
    posicao: registro.posicao_pericons_sintese ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(registro);
  if (registro !== sync && !dirty && !salvando) {
    setSync(registro);
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
  const toggleProvidencia = (codigo: string) =>
    setF((s) => ({
      ...s,
      providencia: s.providencia.includes(codigo)
        ? s.providencia.filter((c) => c !== codigo)
        : [...s.providencia, codigo],
    }));

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const r = await salvarRegistroDemandaAt({
      cicloId,
      processoId,
      objetoAnalise: f.objeto || null,
      teseAssistida: f.tese || null,
      classificacaoGlobal: f.classificacao || null,
      providenciaRecomendada: f.providencia,
      posicaoPericonsSintese: f.posicao || null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Registro (Assistência Técnica) salvo." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-5 max-w-2xl">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Análise do laudo — Assistência Técnica
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          O laudo do perito judicial entra pela seção &ldquo;Documentos&rdquo; abaixo, com o papel
          &ldquo;Laudo analisado&rdquo;.
        </p>
      </div>

      <div>
        <label htmlFor="objeto_analise" className={labelClass}>
          Objeto da análise
        </label>
        <textarea
          id="objeto_analise"
          value={f.objeto}
          onChange={(e) => set("objeto", e.target.value)}
          rows={2}
          placeholder="O que o advogado pediu para analisar."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="tese_assistida" className={labelClass}>
          Tese da parte assistida
        </label>
        <textarea
          id="tese_assistida"
          value={f.tese}
          onChange={(e) => set("tese", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div id="classificacao-global-campo" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="classificacao_global" className={labelClass}>
            Classificação global do laudo
          </label>
          {!f.classificacao && <Selo variante="atencao">Obrigatória</Selo>}
        </div>
        <select
          id="classificacao_global"
          value={f.classificacao}
          onChange={(e) => set("classificacao", e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {CLASSIFICACAO_GLOBAL_ORDENADA.map((c) => (
            <option key={c} value={c}>
              {CLASSIFICACAO_GLOBAL_ROTULOS[c]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-nevoa-500 dark:text-nevoa-400">
          Exigida para gerar qualquer parecer de Assistência Técnica.
        </p>
      </div>

      <fieldset id="providencia-recomendada" className="scroll-mt-24">
        <legend className={labelClass}>Providência recomendada (pode marcar mais de uma)</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
          {PROVIDENCIA_AT_ORDENADA.map((codigo) => (
            <label
              key={codigo}
              className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200"
            >
              <input
                type="checkbox"
                checked={f.providencia.includes(codigo)}
                onChange={() => toggleProvidencia(codigo)}
                className="rounded border-nevoa-400 text-petroleo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
              />
              {PROVIDENCIA_AT_ROTULOS[codigo]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="posicao_pericons" className={labelClass}>
          Posição da PERICONS sobre o laudo (síntese)
        </label>
        <textarea
          id="posicao_pericons"
          value={f.posicao}
          onChange={(e) => set("posicao", e.target.value)}
          rows={3}
          placeholder="Uma frase — entra literalmente no documento gerado."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Botao
          onClick={() => salvar()}
          disabled={!dirty && !salvando}
          carregando={salvando}
          textoCarregando="Salvando…"
        >
          {dirty ? "Salvar" : "Salvo"}
        </Botao>
      </div>

      {mensagem && (
        <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />
      )}
    </div>
  );
}
