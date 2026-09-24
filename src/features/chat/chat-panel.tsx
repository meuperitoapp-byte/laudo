"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem } from "./actions";
import { Botao } from "@/components/ui/button";
import type { ChatMensagensRow } from "@/types/database";

const dataHoraCurta = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoData = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return mesmoData ? hora : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
};

/**
 * Chat interno — sala única, geral, sem canais nem DM (pedido da Dra.
 * Fernanda, 24/09/2026). Tempo real de verdade via Supabase Realtime:
 * primeira vez que o sistema usa esse recurso (todo o resto do app é
 * Server Component + refresh). Sem otimismo local no envio — a própria
 * mensagem enviada só aparece quando o evento Realtime volta, igual pra
 * todo mundo; evita duplicar linha na tela por causa de round-trip.
 */
export function ChatPanel({ mensagensIniciais, meuEmail }: { mensagensIniciais: ChatMensagensRow[]; meuEmail: string }) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("chat_mensagens")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new as ChatMensagensRow]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  function enviar(formData: FormData) {
    setErro(null);
    const textoEnviado = texto;
    setTexto("");
    startTransition(async () => {
      const resultado = await enviarMensagem(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        setTexto(textoEnviado); // devolve o texto pro campo se falhou, pra ela não perder o que escreveu
      }
    });
  }

  return (
    <div className="flex flex-col rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 h-[calc(100vh-220px)]">
      <ul className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 && (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 text-center py-8">
            Nenhuma mensagem ainda — escreva a primeira.
          </p>
        )}
        {mensagens.map((m) => {
          const minha = m.autor_email === meuEmail;
          return (
            <li key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                  minha
                    ? "bg-petroleo-600 text-white dark:bg-petroleo-500"
                    : "bg-nevoa-100 dark:bg-nevoa-800 text-nevoa-900 dark:text-nevoa-100"
                }`}
              >
                {!minha && <p className="text-xs font-semibold mb-0.5 opacity-75">{m.autor_nome}</p>}
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                <p className={`text-[11px] mt-1 text-right ${minha ? "text-petroleo-100/80" : "opacity-60"}`}>
                  {dataHoraCurta(m.created_at)}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={fimDaListaRef} />
      </ul>

      <form
        action={enviar}
        className="flex items-end gap-2 border-t border-nevoa-200 dark:border-nevoa-800 p-3"
      >
        <textarea
          name="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Escreva uma mensagem…"
          className="flex-1 resize-none rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
        />
        <Botao type="submit" carregando={isPending} textoCarregando="Enviando…">
          Enviar
        </Botao>
      </form>
      {erro && <p className="px-3 pb-2 text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
