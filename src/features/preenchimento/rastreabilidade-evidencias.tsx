"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { desvincularEvidencia, vincularEvidencia } from "@/features/rastreabilidade/actions";
import type { RespostaEvidenciasRow } from "@/types/database";
import type { AchadoParaVinculo, DocumentoParaVinculo } from "./rastreabilidade-tipos";

/**
 * "Elementos que sustentam esta conclusão" — CLAUDE.md > "Regra:
 * rastreabilidade". Só aparece em campos com requer_confirmacao_perito
 * (decidido pelo caller, campo-field.tsx); `podeVincular` (também decidido
 * lá) trava a UI de vínculo até a conclusão estar salva E confirmada — antes
 * disso não existe `respostaId` de verdade pra apontar.
 */
export function RastreabilidadeEvidencias({
  podeVincular,
  respostaId,
  processoId,
  secaoId,
  evidencias,
  achadosDisponiveis,
  documentosDisponiveis,
}: {
  podeVincular: boolean;
  respostaId: string | undefined;
  processoId: string;
  secaoId: string;
  evidencias: RespostaEvidenciasRow[];
  achadosDisponiveis: AchadoParaVinculo[];
  documentosDisponiveis: DocumentoParaVinculo[];
}) {
  const router = useRouter();
  const [abrindo, setAbrindo] = useState<"achado" | "documento" | null>(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!podeVincular) {
    return (
      <p className="text-xs text-nevoa-400 dark:text-nevoa-600 italic mt-1">
        Salve esta seção com a conclusão confirmada pra poder vincular elementos que a sustentam.
      </p>
    );
  }

  const achadosPorId = new Map(achadosDisponiveis.map((a) => [a.respostaId, a]));
  const documentosPorId = new Map(documentosDisponiveis.map((d) => [d.id, d]));

  const respostaIdsJaVinculadas = new Set(
    evidencias.map((e) => e.resposta_referenciada_id).filter((id): id is string => Boolean(id))
  );
  const documentoIdsJaVinculados = new Set(
    evidencias.map((e) => e.documento_id).filter((id): id is string => Boolean(id))
  );

  const achadosFiltrados = achadosDisponiveis
    .filter((a) => a.respostaId !== respostaId && !respostaIdsJaVinculadas.has(a.respostaId))
    .filter(
      (a) =>
        !busca.trim() || `${a.rotulo} ${a.secaoTitulo} ${a.resumo}`.toLowerCase().includes(busca.trim().toLowerCase())
    );

  const documentosFiltrados = documentosDisponiveis.filter((d) => !documentoIdsJaVinculados.has(d.id));

  function vincular(tipo: "achado" | "documento", idAlvo: string) {
    if (!respostaId) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await vincularEvidencia({
        processoId,
        secaoId,
        respostaId,
        respostaReferenciadaId: tipo === "achado" ? idAlvo : undefined,
        documentoId: tipo === "documento" ? idAlvo : undefined,
      });
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setAbrindo(null);
      setBusca("");
      router.refresh();
    });
  }

  function desvincular(evidenciaId: string) {
    setErro(null);
    startTransition(async () => {
      const resultado = await desvincularEvidencia(evidenciaId, processoId, secaoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-2 rounded-md border border-nevoa-200 dark:border-nevoa-800 p-3 space-y-2">
      <p className="text-xs font-medium text-nevoa-600 dark:text-nevoa-400">
        Elementos que sustentam esta conclusão
      </p>

      {evidencias.length === 0 ? (
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600">Nenhum elemento vinculado ainda.</p>
      ) : (
        <ul className="space-y-1">
          {evidencias.map((ev) => {
            let rotulo = "—";
            if (ev.documento_id) {
              rotulo = documentosPorId.get(ev.documento_id)?.nomeArquivo ?? "Documento removido";
            } else if (ev.resposta_referenciada_id) {
              const achado = achadosPorId.get(ev.resposta_referenciada_id);
              rotulo = achado ? `${achado.secaoTitulo} — ${achado.rotulo}` : "Resposta removida";
            }
            return (
              <li key={ev.id} className="flex items-center justify-between gap-2 text-xs text-nevoa-700 dark:text-nevoa-300">
                <span>
                  {ev.documento_id ? "📄" : "🔗"} {rotulo}
                </span>
                <button
                  type="button"
                  onClick={() => desvincular(ev.id)}
                  disabled={isPending}
                  className="text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-30 shrink-0"
                >
                  remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setAbrindo(abrindo === "achado" ? null : "achado")}
          className="text-petroleo-600 hover:underline dark:text-petroleo-400"
        >
          Vincular achado clínico
        </button>
        <button
          type="button"
          onClick={() => setAbrindo(abrindo === "documento" ? null : "documento")}
          className="text-petroleo-600 hover:underline dark:text-petroleo-400"
        >
          Vincular documento
        </button>
      </div>

      {abrindo === "achado" && (
        <div className="space-y-1">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por seção/campo/resposta..."
            className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-xs text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
          />
          <div className="max-h-40 overflow-y-auto rounded-md border border-nevoa-200 dark:border-nevoa-800 divide-y divide-nevoa-100 dark:divide-nevoa-800">
            {achadosFiltrados.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-nevoa-400 dark:text-nevoa-600">Nada encontrado.</p>
            )}
            {achadosFiltrados.map((a) => (
              <button
                key={a.respostaId}
                type="button"
                onClick={() => vincular("achado", a.respostaId)}
                disabled={isPending}
                className="block w-full text-left px-2 py-1.5 text-xs hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
              >
                <span className="font-medium text-nevoa-900 dark:text-nevoa-100">
                  {a.secaoTitulo} — {a.rotulo}
                </span>
                <span className="block text-nevoa-500 dark:text-nevoa-400 truncate">{a.resumo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {abrindo === "documento" && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-nevoa-200 dark:border-nevoa-800 divide-y divide-nevoa-100 dark:divide-nevoa-800">
          {documentosFiltrados.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-nevoa-400 dark:text-nevoa-600">Nenhum documento disponível.</p>
          )}
          {documentosFiltrados.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => vincular("documento", d.id)}
              disabled={isPending}
              className="block w-full text-left px-2 py-1.5 text-xs text-nevoa-800 dark:text-nevoa-200 hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
            >
              {d.nomeArquivo}
              {d.categoria ? ` — ${d.categoria}` : ""}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
