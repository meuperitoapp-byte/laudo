"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarRegistroDemanda } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { NATUREZA_ORDENADA, NATUREZA_ROTULOS, ORIGEM_ROTULOS } from "./rotulos";
import type { PosLaudoOrigem } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const ORIGENS: PosLaudoOrigem[] = ["autor", "reu", "ambos", "juizo", "mp", "outro"];

export interface CicloRegistro {
  id: string;
  data_intimacao: string | null;
  prazo: string | null;
  origem: string | null;
  natureza: string[] | null;
  documento_intimacao_id: string | null;
}

/** Serializa os campos do registro pra comparar "o que está na tela" x "o que está salvo". */
function snapshot(v: {
  dataIntimacao: string;
  prazo: string;
  origem: string;
  natureza: string[];
  documentoIntimacaoId: string;
}): string {
  return JSON.stringify([
    v.dataIntimacao,
    v.prazo,
    v.origem,
    [...v.natureza].sort(),
    v.documentoIntimacaoId,
  ]);
}

export function RegistroDemandaForm({
  processoId,
  ciclo,
  documentos,
}: {
  processoId: string;
  ciclo: CicloRegistro;
  documentos: { id: string; nome_arquivo: string }[];
}) {
  const router = useRouter();

  const doBanco = useMemo(
    () => ({
      dataIntimacao: ciclo.data_intimacao ?? "",
      prazo: ciclo.prazo ?? "",
      origem: ciclo.origem ?? "",
      natureza: ciclo.natureza ?? [],
      documentoIntimacaoId: ciclo.documento_intimacao_id ?? "",
    }),
    [ciclo],
  );

  const [dataIntimacao, setDataIntimacao] = useState(doBanco.dataIntimacao);
  const [prazo, setPrazo] = useState(doBanco.prazo);
  const [origem, setOrigem] = useState(doBanco.origem);
  const [natureza, setNatureza] = useState<string[]>(doBanco.natureza);
  const [documentoIntimacaoId, setDocumentoIntimacaoId] = useState(doBanco.documentoIntimacaoId);

  const [salvoSnapshot, setSalvoSnapshot] = useState(() => snapshot(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const atual = { dataIntimacao, prazo, origem, natureza, documentoIntimacaoId };
  const dirty = snapshot(atual) !== salvoSnapshot;

  // Sem edições pendentes, adota o que veio do servidor (ex.: a secretária
  // editou o mesmo ciclo noutra aba) — ajuste de estado derivado de prop feito
  // no render, não num efeito (doc do React), igual ao secao-workspace.
  const [cicloSincronizado, setCicloSincronizado] = useState(ciclo);
  if (ciclo !== cicloSincronizado && !dirty && !salvando) {
    setCicloSincronizado(ciclo);
    setDataIntimacao(doBanco.dataIntimacao);
    setPrazo(doBanco.prazo);
    setOrigem(doBanco.origem);
    setNatureza(doBanco.natureza);
    setDocumentoIntimacaoId(doBanco.documentoIntimacaoId);
    setSalvoSnapshot(snapshot(doBanco));
  }

  // Avisa antes de fechar/atualizar a aba com alterações não salvas —
  // mesmo guard do motor de preenchimento.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function toggleNatureza(codigo: string) {
    setNatureza((n) => (n.includes(codigo) ? n.filter((c) => c !== codigo) : [...n, codigo]));
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const r = await salvarRegistroDemanda({
      cicloId: ciclo.id,
      processoId,
      dataIntimacao: dataIntimacao || null,
      prazo: prazo || null,
      origem: origem || null,
      natureza,
      documentoIntimacaoId: documentoIntimacaoId || null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnapshot(snapshot(atual));
    setMensagem({ tipo: "ok", texto: "Registro salvo." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-5 max-w-2xl">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Registro da demanda
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="data_intimacao" className={labelClass}>
            Data da intimação
          </label>
          <input
            id="data_intimacao"
            type="date"
            value={dataIntimacao}
            onChange={(e) => setDataIntimacao(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="prazo" className={labelClass}>
            Prazo
          </label>
          <input
            id="prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="origem" className={labelClass}>
          Origem da manifestação
        </label>
        <select
          id="origem"
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>
              {ORIGEM_ROTULOS[o]}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>Natureza (pode marcar mais de uma)</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
          {NATUREZA_ORDENADA.map((codigo) => (
            <label
              key={codigo}
              className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200"
            >
              <input
                type="checkbox"
                checked={natureza.includes(codigo)}
                onChange={() => toggleNatureza(codigo)}
                className="rounded border-nevoa-400 text-petroleo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
              />
              {NATUREZA_ROTULOS[codigo]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="documento_intimacao" className={labelClass}>
            Arquivo da intimação (opcional)
          </label>
          {!documentoIntimacaoId && <Selo variante="atencao">Pendente</Selo>}
        </div>
        <select
          id="documento_intimacao"
          value={documentoIntimacaoId}
          onChange={(e) => setDocumentoIntimacaoId(e.target.value)}
          className={inputClass}
        >
          <option value="">— nenhum —</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome_arquivo}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-nevoa-500 dark:text-nevoa-400">
          Escolhe um documento já anexado ao processo. Pra enviar um novo, use a aba{" "}
          <a
            href={`/processos/${processoId}/documentos`}
            className="text-petroleo-600 hover:underline dark:text-petroleo-400"
          >
            Documentos
          </a>{" "}
          e volte aqui.
        </p>
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
