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
      <p className="text-xs text-zinc-400 italic mt-1">
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
    <div className="mt-2 rounded border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Elementos que sustentam esta conclusão
      </p>

      {evidencias.length === 0 ? (
        <p className="text-xs text-zinc-400">Nenhum elemento vinculado ainda.</p>
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
              <li key={ev.id} className="flex items-center justify-between gap-2 text-xs">
                <span>
                  {ev.documento_id ? "📄" : "🔗"} {rotulo}
                </span>
                <button
                  type="button"
                  onClick={() => desvincular(ev.id)}
                  disabled={isPending}
                  className="text-red-600 underline disabled:opacity-30 shrink-0"
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
          className="underline text-zinc-500"
        >
          Vincular achado clínico
        </button>
        <button
          type="button"
          onClick={() => setAbrindo(abrindo === "documento" ? null : "documento")}
          className="underline text-zinc-500"
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
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
          />
          <div className="max-h-40 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {achadosFiltrados.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-zinc-400">Nada encontrado.</p>
            )}
            {achadosFiltrados.map((a) => (
              <button
                key={a.respostaId}
                type="button"
                onClick={() => vincular("achado", a.respostaId)}
                disabled={isPending}
                className="block w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="font-medium">
                  {a.secaoTitulo} — {a.rotulo}
                </span>
                <span className="block text-zinc-500 truncate">{a.resumo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {abrindo === "documento" && (
        <div className="max-h-40 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {documentosFiltrados.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-zinc-400">Nenhum documento disponível.</p>
          )}
          {documentosFiltrados.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => vincular("documento", d.id)}
              disabled={isPending}
              className="block w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {d.nomeArquivo}
              {d.categoria ? ` — ${d.categoria}` : ""}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
