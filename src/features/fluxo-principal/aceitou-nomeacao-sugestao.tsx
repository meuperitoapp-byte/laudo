"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sugerirAceitouNomeacao } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { SITUACAO_PROCESSO_RECUSA, SITUACAO_PROCESSO_DEVOLUCAO } from "@/features/processos/catalogos";
import type { AceitouNomeacao } from "@/types/enums";

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });

export interface DocumentoProtocoladoAceite {
  tipo: "impossibilidade_assumir" | "escusa_declinio_pericial";
  protocoladoEm: string;
}

const ALVO_POR_TIPO: Record<
  DocumentoProtocoladoAceite["tipo"],
  { valor: AceitouNomeacao; rotulo: string; situacaoProcesso: string; nomeDocumento: string }
> = {
  impossibilidade_assumir: {
    valor: "nao",
    rotulo: "Não aceitou o encargo",
    situacaoProcesso: SITUACAO_PROCESSO_RECUSA,
    nomeDocumento: "Impossibilidade de Assumir o Encargo",
  },
  escusa_declinio_pericial: {
    valor: "encargo_declinado",
    rotulo: "Encargo declinado (devolvido após aceitar)",
    situacaoProcesso: SITUACAO_PROCESSO_DEVOLUCAO,
    nomeDocumento: "Escusa/Declínio do Encargo Já Aceito",
  },
};

/**
 * Sugestão (nunca automática) de atualizar `processos.aceitou_nomeacao` E
 * `processos.situacao_processo` juntos depois de protocolar o nº12 ou o
 * nº13 — pedido do Jeferson (11/09/2026): "se ela protocolou uma escusa, o
 * processo não pode continuar se comportando como encargo ativo, senão a
 * régua e a Central de Prazos vão cobrar providências de algo que ela
 * devolveu ao juízo. Mas isso é mudança de estado a partir de um ato
 * formal... o sistema sugere, com o motivo visível, e ela confirma. Nunca
 * aplica sozinho." Mesmo mecanismo do `SituacaoProcessoSugestao` do
 * Pós-Laudo — "Agora não" dispensa só nesta sessão de tela.
 *
 * `situacao_processo` entrou na sugestão em 18/09/2026 (confirmado pela
 * Dra.: recusa e devolução são valores DISTINTOS nesse catálogo, nunca uma
 * palavra só) — aparece se QUALQUER um dos dois campos ainda não reflete o
 * documento protocolado, e "Marcar" grava os dois juntos (mesmo fato, uma
 * confirmação só).
 */
export function AceitouNomeacaoSugestao({
  processoId,
  aceitouNomeacaoAtual,
  situacaoProcessoAtual,
  documentoProtocolado,
}: {
  processoId: string;
  aceitouNomeacaoAtual: AceitouNomeacao | null;
  situacaoProcessoAtual: string | null;
  documentoProtocolado: DocumentoProtocoladoAceite | null;
}) {
  const router = useRouter();
  const [dispensada, setDispensada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!documentoProtocolado || dispensada) return null;
  const alvo = ALVO_POR_TIPO[documentoProtocolado.tipo];
  if (aceitouNomeacaoAtual === alvo.valor && situacaoProcessoAtual === alvo.situacaoProcesso) return null;

  function aplicar() {
    setErro(null);
    startTransition(async () => {
      const r = await sugerirAceitouNomeacao(processoId, alvo.valor);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-nevoa-300/60 dark:border-nevoa-700/40 bg-nevoa-50 dark:bg-nevoa-900/60 px-4 py-3 text-sm">
      <Selo variante="neutro">Sugestão</Selo>
      <p className="text-nevoa-800 dark:text-nevoa-200">
        {alvo.nomeDocumento} protocolado em {dataCurta(documentoProtocolado.protocoladoEm)}. Marcar o encargo como
        &ldquo;{alvo.rotulo}&rdquo; e a situação do processo como &ldquo;{alvo.situacaoProcesso}&rdquo;?
      </p>
      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          onClick={() => setDispensada(true)}
          className="text-nevoa-500 hover:underline dark:text-nevoa-400"
        >
          Agora não
        </button>
        <Botao variante="secundaria" onClick={aplicar} carregando={isPending} textoCarregando="Aplicando…">
          Marcar
        </Botao>
      </div>
      {erro && <p className="w-full text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
