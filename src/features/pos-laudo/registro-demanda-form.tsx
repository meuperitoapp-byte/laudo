"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRegistroDemanda } from "./actions";
import { Selo } from "@/components/ui/badge";
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

  const [dataIntimacao, setDataIntimacao] = useState(ciclo.data_intimacao ?? "");
  const [prazo, setPrazo] = useState(ciclo.prazo ?? "");
  const [origem, setOrigem] = useState(ciclo.origem ?? "");
  const [natureza, setNatureza] = useState<string[]>(ciclo.natureza ?? []);
  const [documentoIntimacaoId, setDocumentoIntimacaoId] = useState(ciclo.documento_intimacao_id ?? "");

  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Último conteúdo confirmado como salvo — começa igual ao banco, diverge
  // enquanto edita, volta a bater quando salva.
  const [salvo, setSalvo] = useState({
    dataIntimacao: ciclo.data_intimacao ?? "",
    prazo: ciclo.prazo ?? "",
    origem: ciclo.origem ?? "",
    natureza: (ciclo.natureza ?? []).join("|"),
    documentoIntimacaoId: ciclo.documento_intimacao_id ?? "",
  });
  const naturezaChave = [...natureza].sort().join("|");
  const alterado =
    dataIntimacao !== salvo.dataIntimacao ||
    prazo !== salvo.prazo ||
    origem !== salvo.origem ||
    naturezaChave !== salvo.natureza ||
    documentoIntimacaoId !== salvo.documentoIntimacaoId;

  const salvar = useCallback(() => {
    setErro(null);
    startTransition(async () => {
      const alvo = {
        dataIntimacao: dataIntimacao || null,
        prazo: prazo || null,
        origem: origem || null,
        natureza,
        documentoIntimacaoId: documentoIntimacaoId || null,
      };
      const r = await salvarRegistroDemanda({ cicloId: ciclo.id, processoId, ...alvo });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setSalvo({
        dataIntimacao: dataIntimacao,
        prazo: prazo,
        origem: origem,
        natureza: [...natureza].sort().join("|"),
        documentoIntimacaoId: documentoIntimacaoId,
      });
      router.refresh();
    });
  }, [dataIntimacao, prazo, origem, natureza, documentoIntimacaoId, ciclo.id, processoId, router]);

  // Autosave ~1,2s depois de parar de mexer (Dra. Fernanda: não perder dado
  // numa queda de energia). Nenhum campo é obrigatório aqui, então pode
  // disparar livre.
  useEffect(() => {
    if (!alterado || isPending) return;
    const t = setTimeout(() => salvar(), 1200);
    return () => clearTimeout(t);
  }, [alterado, isPending, salvar]);

  // Sem edições pendentes nesta aba, adota o que veio do servidor (ex.: a
  // secretária editou o mesmo ciclo noutra aba) — ajuste de estado derivado de
  // prop feito no render, não num efeito (doc do React).
  const [cicloSincronizado, setCicloSincronizado] = useState(ciclo);
  if (ciclo !== cicloSincronizado && !alterado && !isPending) {
    setCicloSincronizado(ciclo);
    setDataIntimacao(ciclo.data_intimacao ?? "");
    setPrazo(ciclo.prazo ?? "");
    setOrigem(ciclo.origem ?? "");
    setNatureza(ciclo.natureza ?? []);
    setDocumentoIntimacaoId(ciclo.documento_intimacao_id ?? "");
    setSalvo({
      dataIntimacao: ciclo.data_intimacao ?? "",
      prazo: ciclo.prazo ?? "",
      origem: ciclo.origem ?? "",
      natureza: (ciclo.natureza ?? []).join("|"),
      documentoIntimacaoId: ciclo.documento_intimacao_id ?? "",
    });
  }

  function toggleNatureza(codigo: string) {
    setNatureza((atual) =>
      atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo],
    );
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
            <label key={codigo} className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
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

      <div className="flex items-center gap-3 text-xs text-nevoa-500 dark:text-nevoa-400">
        {isPending
          ? "Salvando…"
          : alterado
            ? "Alterações não salvas — salvam sozinhas em instantes"
            : "Salvo automaticamente"}
        {erro && <span className="text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </div>
  );
}
