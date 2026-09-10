"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sugerirSituacaoProcesso } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { SITUACAO_PROCESSO_POS_LAUDO, SITUACOES_PROCESSO_ORDENADA } from "@/features/processos/catalogos";

/**
 * Sugestão (fatia 11) de mudar `processos.situacao_processo` a partir do
 * ciclo de pós-laudo — NUNCA automática, sempre um clique explícito da
 * perita (decisão confirmada com o Jeferson em 03/09/2026: "o sistema
 * sugere, não muda sozinho"). Dois momentos, um componente só:
 *
 *   - ciclo ABERTO: sugere marcar `SITUACAO_PROCESSO_POS_LAUDO` — some
 *     sozinha quando a situação já é essa (nada a sugerir).
 *   - ciclo ENCERRADO: sugere VOLTAR, com uma lista pra ela escolher (o
 *     sistema não decide pra qual situação voltar).
 *
 * "Agora não" dispensa a sugestão só nesta sessão de tela (estado local,
 * sem persistir) — ela pode fechar e decidir depois, sem incomodar de novo
 * a cada refresh dentro da mesma visita à página.
 */
export function SituacaoProcessoSugestao({
  processoId,
  cicloId,
  situacaoAtual,
  cicloEncerrado,
}: {
  processoId: string;
  cicloId: string;
  situacaoAtual: string | null;
  cicloEncerrado: boolean;
}) {
  const router = useRouter();
  const [dispensada, setDispensada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [situacaoEscolhida, setSituacaoEscolhida] = useState(
    situacaoAtual && situacaoAtual !== SITUACAO_PROCESSO_POS_LAUDO ? situacaoAtual : "Laudo protocolado",
  );

  function aplicar(valor: string) {
    setErro(null);
    startTransition(async () => {
      const r = await sugerirSituacaoProcesso(processoId, cicloId, valor);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (dispensada) return null;

  if (!cicloEncerrado) {
    if (situacaoAtual === SITUACAO_PROCESSO_POS_LAUDO) return null;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-nevoa-300/60 dark:border-nevoa-700/40 bg-nevoa-50 dark:bg-nevoa-900/60 px-4 py-3 text-sm">
        <Selo variante="neutro">Sugestão</Selo>
        <p className="text-nevoa-800 dark:text-nevoa-200">
          Situação do processo hoje: <strong>{situacaoAtual ?? "—"}</strong>. Marcar como &ldquo;
          {SITUACAO_PROCESSO_POS_LAUDO}&rdquo;?
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => setDispensada(true)}
            className="text-nevoa-500 hover:underline dark:text-nevoa-400"
          >
            Agora não
          </button>
          <Botao
            variante="secundaria"
            onClick={() => aplicar(SITUACAO_PROCESSO_POS_LAUDO)}
            carregando={isPending}
            textoCarregando="Aplicando…"
          >
            Marcar situação
          </Botao>
        </div>
        {erro && <p className="w-full text-vinho-600 dark:text-vinho-400">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-nevoa-300/60 dark:border-nevoa-700/40 bg-nevoa-50 dark:bg-nevoa-900/60 px-4 py-3 text-sm">
      <Selo variante="neutro">Sugestão</Selo>
      <p className="text-nevoa-800 dark:text-nevoa-200">
        Ciclo encerrado. Situação do processo hoje: <strong>{situacaoAtual ?? "—"}</strong>. Quer atualizar?
      </p>
      <select
        value={situacaoEscolhida}
        onChange={(e) => setSituacaoEscolhida(e.target.value)}
        aria-label="Nova situação do processo"
        className="rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-sm text-nevoa-900 dark:text-nevoa-100"
      >
        {SITUACOES_PROCESSO_ORDENADA.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          onClick={() => setDispensada(true)}
          className="text-nevoa-500 hover:underline dark:text-nevoa-400"
        >
          Agora não
        </button>
        <Botao
          variante="secundaria"
          onClick={() => aplicar(situacaoEscolhida)}
          carregando={isPending}
          textoCarregando="Aplicando…"
        >
          Atualizar situação
        </Botao>
      </div>
      {erro && <p className="w-full text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
