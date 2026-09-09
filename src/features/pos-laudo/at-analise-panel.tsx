"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarAtAnalise, type AtAnalisePatch } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { PosLaudoAtAnaliseRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/** Cada eixo: a coluna boolean e a pergunta que a acompanha. A ordem é a do PDF §12. */
const EIXOS = [
  ["respondeu_objeto", "Respondeu ao objeto da perícia?"],
  ["respondeu_quesitos", "Respondeu a todos os quesitos?"],
  ["considerou_documentos", "Considerou todos os documentos?"],
  ["tem_omissoes", "Há omissões?"],
  ["tem_contradicoes", "Há contradições?"],
  ["tem_erros_tecnicos", "Há erros técnicos?"],
  ["tem_erros_conceituais", "Há erros conceituais?"],
  ["extrapolou_objeto", "Houve extrapolação do objeto?"],
  ["conclusoes_sem_fundamentacao", "Há conclusões sem fundamentação?"],
  ["divergencia_literatura", "Há divergência com a literatura?"],
  ["tem_fato_novo", "Há fato novo?"],
  ["favorece_tese", "Favorece a tese da parte assistida?"],
  ["prejudica_tese", "Prejudica a tese da parte assistida?"],
] as const;

type EixoChave = (typeof EIXOS)[number][0];

type Estado = {
  conclusaoDoPerito: string;
  impactoProcessual: string;
} & Record<EixoChave, "" | "sim" | "nao"> &
  Record<`${EixoChave}_nota`, string>;

const boolParaSelect = (v: boolean | null): "" | "sim" | "nao" => (v === null ? "" : v ? "sim" : "nao");
const selectParaBool = (v: "" | "sim" | "nao"): boolean | null => (v === "" ? null : v === "sim");

function estadoInicial(row: PosLaudoAtAnaliseRow | null): Estado {
  const base = {
    conclusaoDoPerito: row?.conclusao_do_perito ?? "",
    impactoProcessual: row?.impacto_processual ?? "",
  } as Estado;
  for (const [chave] of EIXOS) {
    base[chave] = boolParaSelect(row ? row[chave] : null);
    base[`${chave}_nota`] = (row ? row[`${chave}_nota`] : null) ?? "";
  }
  return base;
}

/**
 * "Análise estruturada do laudo judicial" (Gestão AT.pdf §12). Formulário
 * único, um só botão "Salvar" — mesma linha do ComplementacaoPanel. O
 * resultado global (FAVORÁVEL…DESFAVORÁVEL) fica no Registro da Demanda AT,
 * não aqui.
 */
export function AtAnalisePanel({
  processoId,
  cicloId,
  analise,
}: {
  processoId: string;
  cicloId: string;
  analise: PosLaudoAtAnaliseRow | null;
}) {
  const router = useRouter();

  const [f, setF] = useState<Estado>(() => estadoInicial(analise));
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(estadoInicial(analise)));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(analise);
  if (analise !== sync && !dirty && !salvando) {
    setSync(analise);
    const novo = estadoInicial(analise);
    setF(novo);
    setSalvoSnap(JSON.stringify(novo));
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

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const patch: AtAnalisePatch = {
      conclusaoDoPerito: f.conclusaoDoPerito || null,
      impactoProcessual: f.impactoProcessual || null,
    };
    for (const [chave] of EIXOS) {
      patch[chave] = selectParaBool(f[chave]);
      patch[`${chave}_nota`] = f[`${chave}_nota`] || null;
    }
    const r = await salvarAtAnalise(cicloId, processoId, patch);
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Análise do laudo salva." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-5 max-w-2xl">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Análise estruturada do laudo
      </h2>

      <div>
        <label htmlFor="conclusao_do_perito" className={labelClass}>
          Conclusão do perito judicial
        </label>
        <textarea
          id="conclusao_do_perito"
          value={f.conclusaoDoPerito}
          onChange={(e) => set("conclusaoDoPerito", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="space-y-4">
        {EIXOS.map(([chave, pergunta]) => (
          <div key={chave} className="border-t border-nevoa-200 dark:border-nevoa-800 pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-nevoa-800 dark:text-nevoa-200">{pergunta}</span>
              <select
                value={f[chave]}
                onChange={(e) => set(chave, e.target.value as "" | "sim" | "nao")}
                aria-label={pergunta}
                className="rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-sm text-nevoa-900 dark:text-nevoa-100"
              >
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <textarea
              value={f[`${chave}_nota`]}
              onChange={(e) => set(`${chave}_nota`, e.target.value)}
              rows={2}
              placeholder="Nota (opcional)"
              className={`${inputClass} mt-2`}
              aria-label={`${pergunta} — nota`}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-3">
        <label htmlFor="impacto_processual" className={labelClass}>
          Impacto processual
        </label>
        <textarea
          id="impacto_processual"
          value={f.impactoProcessual}
          onChange={(e) => set("impactoProcessual", e.target.value)}
          rows={3}
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
