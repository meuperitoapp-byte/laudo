"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { AtualizacoesSistemaRow } from "@/types/database";

const CHAVE_ULTIMA_VISUALIZACAO = "pericons_notificacoes_ultima_visualizacao";

function dataRelativa(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `Há ${dias} dias`;
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Lê a última visualização do localStorage — só existe no client, por isso a
 * inicialização "preguiçosa" do useState (roda uma vez, na primeira
 * renderização, não como efeito) em vez de useEffect + setState (que
 * causaria uma renderização em cascata desnecessária).
 */
function calcularNaoLidas(atualizacoes: AtualizacoesSistemaRow[]): number {
  if (typeof window === "undefined" || atualizacoes.length === 0) return 0;
  try {
    const ultimaVisualizacao = localStorage.getItem(CHAVE_ULTIMA_VISUALIZACAO) ?? "1970-01-01T00:00:00.000Z";
    return atualizacoes.filter((a) => a.created_at > ultimaVisualizacao).length;
  } catch {
    return atualizacoes.length;
  }
}

/**
 * Sino de notificações (24/09/2026, pedido do Jeferson) — lista as
 * atualizações/melhorias do sistema em linguagem simples, pra Dra. Fernanda
 * e a equipe ficarem cientes sem precisar perguntar. "Já vi" é só do
 * navegador (localStorage) — só 2-3 pessoas usam o sistema, não precisa
 * sincronizar entre dispositivos nem tabela de leitura por usuário.
 */
export function NotificacoesSino({ atualizacoes }: { atualizacoes: AtualizacoesSistemaRow[] }) {
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(() => calcularNaoLidas(atualizacoes));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  function abrir() {
    setAberto((v) => !v);
    if (!aberto) {
      setNaoLidas(0);
      try {
        localStorage.setItem(CHAVE_ULTIMA_VISUALIZACAO, new Date().toISOString());
      } catch {
        // sem persistência — sem problema, só volta a marcar como não lida na próxima visita
      }
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={abrir}
        aria-label="Notificações"
        aria-expanded={aberto}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-petroleo-100/80 hover:bg-white/15 hover:text-white transition-colors"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vinho-600 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 max-h-96 overflow-y-auto rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 shadow-lg py-2 text-sm z-20">
          <p className="px-4 py-1.5 font-title font-semibold text-nevoa-900 dark:text-nevoa-100">Atualizações do sistema</p>
          {atualizacoes.length === 0 ? (
            <p className="px-4 py-3 text-nevoa-500 dark:text-nevoa-400">Nenhuma atualização registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-nevoa-100 dark:divide-nevoa-800">
              {atualizacoes.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <p className="text-nevoa-900 dark:text-nevoa-100 font-medium">{a.titulo}</p>
                  {a.descricao && <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">{a.descricao}</p>}
                  <p className="text-[11px] text-nevoa-400 dark:text-nevoa-500 mt-1">{dataRelativa(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
