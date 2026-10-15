"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, User, X } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { moduloDaRota } from "@/features/acessos/mapa-modulos";
import { NotificacoesSino } from "@/components/ui/notificacoes-sino";
import { createClient } from "@/lib/supabase/client";
import { contarChatNaoLidas, marcarChatLido } from "@/features/chat/actions";
import type { ModuloSistema } from "@/types/enums";
import type { AtualizacoesSistemaRow } from "@/types/database";

interface ItemNav {
  href: string;
  rotulo: string;
}

/**
 * Reorganizado pra bater com a navegação PERICONS que a Dra. Fernanda
 * descreveu (item #7 da fila de melhorias, 19-20/09/2026) — só a camada de
 * navegação: cada rótulo aponta pro que já existe hoje (Início = Dashboard,
 * Casos = Processos), e os módulos que ainda não foram construídos
 * (Agenda, Financeiro, Relacionamento, Biblioteca Pericial) apontam pra uma
 * tela "em construção" em vez de ficarem de fora ou fingirem já funcionar.
 * Ver [[pericons-arquitetura-caso]] pro desenho completo, que fica pra uma
 * conversa de escopo própria — nada de módulo novo foi construído aqui.
 */
const ITENS: ItemNav[] = [
  { href: "/dashboard", rotulo: "Início" },
  { href: "/processos", rotulo: "Casos" },
  { href: "/hoje", rotulo: "Hoje" },
  { href: "/agenda", rotulo: "Agenda" },
  { href: "/financeiro", rotulo: "Financeiro" },
  { href: "/relacionamento", rotulo: "Relacionamento" },
  { href: "/biblioteca-pericial", rotulo: "Biblioteca Pericial" },
  { href: "/respostas-reutilizaveis", rotulo: "Respostas" },
  { href: "/chat", rotulo: "Chat" },
  { href: "/configuracoes", rotulo: "Configurações" },
];

/**
 * Barra superior — client component só pra saber a rota ativa
 * (`usePathname`); a checagem de sessão continua no layout (Server
 * Component), que passa `email` como prop. Fundo escuro (petroleo-700) em
 * vez do branco anterior: é a peça que dá "cara de sistema" mencionada pela
 * Dra. Fernanda — todo o resto da tela permanece claro, só esta faixa muda.
 *
 * O e-mail não fica mais visível direto na barra (22/09/2026, pedido dela)
 * — some espaço fixo com nomes de e-mail longos, que agora sobra pros itens
 * de navegação. Fica atrás de um ícone de perfil, num menu que abre ao
 * clicar (mesmo lugar de onde sai o "Sair").
 *
 * Bug corrigido (24/09/2026, relato dela): header e sua div interna tinham
 * `overflow-hidden` — desnecessário (a rolagem horizontal do menu já é
 * autocontida no próprio `<nav>` via `.nav-scroll`, ver globals.css), e
 * cortava o menu de perfil, que é `position: absolute` e estica além da
 * altura de 56px da barra. Resultado: o menu abria mas ficava invisível/
 * cortado, parecendo "sobreposto" e sem dar pra clicar em "Sair".
 */
export function TopNav({
  email,
  modulosPermitidos,
  atualizacoes,
  chatNaoLidasInicial,
}: {
  email: string;
  modulosPermitidos: ModuloSistema[] | null;
  atualizacoes: AtualizacoesSistemaRow[];
  /** Mensagens de outras pessoas desde a última vez que ela abriu o Chat (contado no layout, a partir de chat_leituras). */
  chatNaoLidasInicial: number;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(chatNaoLidasInicial);
  const [aviso, setAviso] = useState<{ id: string; autor: string; texto: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatEstaAberto = pathname.startsWith("/chat");
  // Ref pro callback do Realtime (assinado uma vez só) saber se o Chat está
  // aberto agora, sem reassinar o canal a cada navegação.
  const chatAbertoRef = useRef(chatEstaAberto);
  useEffect(() => {
    chatAbertoRef.current = chatEstaAberto;
  }, [chatEstaAberto]);

  // Aviso de mensagem nova no Chat — lote 15/10/2026 (relato dela: "não
  // aparece que tem novas mensagens para mim"). O pontinho de 2px de antes
  // passava despercebido, dependia do navegador lembrar a última leitura e
  // contava até as mensagens da própria pessoa. Agora: número no item
  // "Chat", aviso flutuante em qualquer tela, número no título da aba e
  // leitura gravada no banco (chat_leituras), por pessoa.
  //
  // "Ajustar estado durante a renderização" (padrão oficial do React, não
  // um efeito): estar no Chat zera o contador.
  if (chatEstaAberto && (naoLidas !== 0 || aviso !== null)) {
    setNaoLidas(0);
    setAviso(null);
  }

  // Abriu o Chat → grava a leitura no banco (efeito só com sistema externo).
  useEffect(() => {
    if (chatEstaAberto) void marcarChatLido();
  }, [chatEstaAberto]);

  // Mensagem nova em QUALQUER página — o `setState` vem do callback do
  // Realtime, não do corpo síncrono do efeito.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("topnav_chat_indicador")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, (payload) => {
        const nova = payload.new as { id: string; autor_email: string; autor_nome: string; texto: string | null; arquivo_nome: string | null };
        if (nova.autor_email === email) return; // a própria mensagem não é "nova" pra quem mandou
        if (chatAbertoRef.current) {
          void marcarChatLido();
          return;
        }
        setNaoLidas((n) => n + 1);
        setAviso({ id: nova.id, autor: nova.autor_nome, texto: nova.texto?.trim() || (nova.arquivo_nome ? `📎 ${nova.arquivo_nome}` : "") });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [email]);

  // Rede de segurança do Realtime (conexão caiu, aba dormiu): reconta a
  // cada minuto e sempre que a aba volta ao foco.
  useEffect(() => {
    async function recontar() {
      if (chatAbertoRef.current) return;
      const n = await contarChatNaoLidas();
      if (n !== null) setNaoLidas(n);
    }
    const intervalo = window.setInterval(recontar, 60_000);
    window.addEventListener("focus", recontar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", recontar);
    };
  }, []);

  // Aviso flutuante some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 8000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  // "(3) Sistema PERICONS" no título da aba — dá pra ver mesmo com outra aba aberta.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = naoLidas > 0 ? `(${naoLidas > 99 ? "99+" : naoLidas}) ${base}` : base;
  }, [naoLidas, pathname]);

  // `null` = admin, vê tudo (mesmo comportamento de sempre). Perfil restrito
  // só vê o item se o módulo daquela rota estiver na lista liberada — mesmo
  // mapa usado pelo middleware pra bloquear de verdade (mapa-modulos.ts),
  // nunca desalinhado.
  const itensVisiveis = modulosPermitidos === null ? ITENS : ITENS.filter((item) => {
    const modulo = moduloDaRota(item.href);
    return modulo !== null && modulosPermitidos.includes(modulo);
  });

  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [menuAberto]);

  return (
    <header className="bg-petroleo-700 dark:bg-nevoa-900 border-b border-petroleo-800/60 dark:border-nevoa-800">
      <div className="flex items-center gap-2 px-6 h-14">
        <Link href="/dashboard" className="flex items-center gap-2.5 pr-5 mr-1 shrink-0">
          <Image src="/logo-pericons.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <span className="font-title text-[15px] font-semibold text-white hidden sm:inline">
            Sistema PERICONS
          </span>
        </Link>

        <nav className="nav-scroll flex items-center gap-2 flex-1 min-w-0 overflow-x-auto overflow-y-visible">
          {itensVisiveis.map((item) => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3.5 py-2 text-sm whitespace-nowrap transition-colors rounded-md ${
                  ativo
                    ? "text-white font-medium bg-white/10"
                    : "text-petroleo-100/75 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.rotulo}
                {item.href === "/chat" && naoLidas > 0 && (
                  <span
                    aria-label={`${naoLidas} mensagens novas`}
                    className="ml-1.5 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-vinho-500 px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums"
                  >
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
                {ativo && <span className="absolute left-3 right-3 -bottom-[9px] h-0.5 rounded-full bg-petroleo-400" />}
              </Link>
            );
          })}
        </nav>

        <NotificacoesSino atualizacoes={atualizacoes} />

        <div ref={menuRef} className="relative shrink-0 pl-2">
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Perfil"
            aria-expanded={menuAberto}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-petroleo-100/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <User className="h-4 w-4" />
          </button>

          {menuAberto && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 shadow-lg py-2 text-sm z-20">
              <p className="px-4 py-1.5 text-nevoa-500 dark:text-nevoa-400 truncate" title={email}>
                {email}
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full text-left px-4 py-1.5 text-nevoa-700 dark:text-nevoa-300 hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
                >
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {aviso && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-nevoa-200 dark:border-nevoa-700 bg-white dark:bg-nevoa-900 shadow-lg p-4"
        >
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 shrink-0 text-petroleo-600 dark:text-petroleo-400 mt-0.5" />
            <Link href="/chat" onClick={() => setAviso(null)} className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Nova mensagem de {aviso.autor}</p>
              {aviso.texto && <p className="text-sm text-nevoa-600 dark:text-nevoa-300 line-clamp-2 mt-0.5">{aviso.texto}</p>}
              <p className="text-xs font-medium text-petroleo-600 dark:text-petroleo-400 mt-1.5">Abrir o Chat →</p>
            </Link>
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Fechar aviso"
              className="shrink-0 text-nevoa-400 hover:text-nevoa-700 dark:hover:text-nevoa-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
