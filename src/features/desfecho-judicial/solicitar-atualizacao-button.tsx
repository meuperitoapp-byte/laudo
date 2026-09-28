"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/button";

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function montarMensagem({ nomeCaso, nomeEscritorio, ultimaAtualizacao }: { nomeCaso: string; nomeEscritorio: string | null; ultimaAtualizacao: string | null }): string {
  const saudacao = nomeEscritorio ? `Prezado(a) ${nomeEscritorio},` : "Prezado(a),";
  const referencia = ultimaAtualizacao
    ? `Nosso último registro é de ${dataCurta(ultimaAtualizacao)}.`
    : "Ainda não temos nenhum desfecho registrado neste caso.";
  return `${saudacao}\n\nPoderia nos atualizar sobre o andamento/desfecho do processo ${nomeCaso}? ${referencia}\n\nAgradecemos desde já.\nEquipe PERICONS`;
}

/**
 * §24.5 — botão "SOLICITAR ATUALIZAÇÃO". O sistema não tem integração de
 * envio (nem WhatsApp nem e-mail customizado — ver CLAUDE.md), então em vez
 * de fingir um envio automático, ele monta a mensagem pronta pra copiar e
 * colar onde a Patrícia for falar com o advogado.
 */
export function SolicitarAtualizacaoButton({ nomeCaso, nomeEscritorio, ultimaAtualizacao }: { nomeCaso: string; nomeEscritorio: string | null; ultimaAtualizacao: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const mensagem = montarMensagem({ nomeCaso, nomeEscritorio, ultimaAtualizacao });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de clipboard — a mensagem já está visível pra copiar manualmente.
    }
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>Solicitar atualização</Botao>;
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 p-4 space-y-3">
      <textarea readOnly value={mensagem} rows={6} className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900 px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100" />
      <div className="flex items-center gap-3">
        <Botao type="button" onClick={copiar}>{copiado ? "Copiado!" : "Copiar mensagem"}</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Fechar</button>
      </div>
    </div>
  );
}
