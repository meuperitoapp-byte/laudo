import type { ModuloSistema } from "@/types/enums";

/**
 * Prefixo de rota -> módulo, na mesma ordem do menu (top-nav.tsx). Usado
 * pelo middleware (bloqueio real) e pelo layout do dashboard (esconder
 * item de menu) — uma fonte só, pra nunca desalinhar as duas checagens.
 * `/tarefas/*` não tem item de menu próprio (só é alcançado a partir de
 * Hoje/Agenda) — amarrado ao módulo "hoje" por não ter dono mais óbvio.
 */
const PREFIXO_MODULO: [prefixo: string, modulo: ModuloSistema][] = [
  ["/dashboard", "dashboard"],
  ["/processos", "processos"],
  ["/tarefas", "hoje"],
  ["/hoje", "hoje"],
  ["/agenda", "agenda"],
  ["/financeiro", "financeiro"],
  ["/relacionamento", "relacionamento"],
  ["/biblioteca-pericial", "biblioteca_pericial"],
  ["/respostas-reutilizaveis", "respostas_reutilizaveis"],
  ["/configuracoes", "configuracoes"],
  ["/chat", "chat"],
];

/** A qual módulo esta rota pertence — `null` pra rota fora do grupo (dashboard) (login, callback, etc.), que nunca é bloqueada por perfil. */
export function moduloDaRota(pathname: string): ModuloSistema | null {
  for (const [prefixo, modulo] of PREFIXO_MODULO) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) return modulo;
  }
  return null;
}

/** Caminho canônico de cada módulo — pra redirecionar alguém restrito pro primeiro módulo que ele tem, quando tenta acessar um que não tem. */
export const CAMINHO_DO_MODULO: Record<ModuloSistema, string> = {
  dashboard: "/dashboard",
  processos: "/processos",
  hoje: "/hoje",
  agenda: "/agenda",
  financeiro: "/financeiro",
  relacionamento: "/relacionamento",
  biblioteca_pericial: "/biblioteca-pericial",
  respostas_reutilizaveis: "/respostas-reutilizaveis",
  configuracoes: "/configuracoes",
  chat: "/chat",
};
