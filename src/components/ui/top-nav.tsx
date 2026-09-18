"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { signOut } from "@/features/auth/actions";

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
 */
export function TopNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="bg-petroleo-700 dark:bg-nevoa-900 border-b border-petroleo-800/60 dark:border-nevoa-800 overflow-hidden">
      <div className="flex items-center gap-2 px-6 h-14 overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 pr-5 mr-1 shrink-0">
          <Image src="/logo-pericons.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <span className="font-title text-[15px] font-semibold text-white hidden sm:inline">
            Sistema PERICONS
          </span>
        </Link>

        <nav className="nav-scroll flex items-center gap-2 flex-1 min-w-0 overflow-x-auto overflow-y-visible">
          {ITENS.map((item) => {
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
                {ativo && <span className="absolute left-3 right-3 -bottom-[9px] h-0.5 rounded-full bg-petroleo-400" />}
              </Link>
            );
          })}
        </nav>

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
    </header>
  );
}
