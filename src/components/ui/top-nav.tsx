"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./logo-mark";
import { signOut } from "@/features/auth/actions";

interface ItemNav {
  href: string;
  rotulo: string;
}

const ITENS: ItemNav[] = [
  { href: "/dashboard", rotulo: "Dashboard" },
  { href: "/hoje", rotulo: "Hoje" },
  { href: "/processos", rotulo: "Processos" },
  { href: "/respostas-reutilizaveis", rotulo: "Respostas" },
  { href: "/configuracoes", rotulo: "Configurações" },
];

/**
 * Barra superior — client component só pra saber a rota ativa
 * (`usePathname`); a checagem de sessão continua no layout (Server
 * Component), que passa `email` como prop. Fundo escuro (petroleo-700) em
 * vez do branco anterior: é a peça que dá "cara de sistema" mencionada pela
 * Dra. Fernanda — todo o resto da tela permanece claro, só esta faixa muda.
 */
export function TopNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="bg-petroleo-700 dark:bg-nevoa-900 border-b border-petroleo-800/60 dark:border-nevoa-800 overflow-hidden">
      <div className="flex items-center gap-2 px-6 h-14 overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 pr-5 mr-1 shrink-0">
          <LogoMark />
          <span className="font-title text-[15px] font-semibold text-white hidden sm:inline">
            Sistema de Laudos Periciais
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-1 min-w-0">
          {ITENS.map((item) => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 text-sm whitespace-nowrap transition-colors rounded-md ${
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

        <div className="flex items-center gap-4 text-sm shrink-0 pl-4">
          <span className="text-petroleo-100/70 hidden md:inline">{email}</span>
          <form action={signOut}>
            <button type="submit" className="text-petroleo-100/80 hover:text-white transition-colors">
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
