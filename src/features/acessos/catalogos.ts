import type { ModuloSistema } from "@/types/enums";

/** Rótulo de cada módulo no painel de permissões — mesmo texto do item de menu (ver top-nav.tsx), pra ela reconhecer na hora. */
export const MODULO_ROTULOS: Record<ModuloSistema, string> = {
  dashboard: "Início",
  processos: "Casos",
  hoje: "Hoje",
  agenda: "Agenda",
  financeiro: "Financeiro",
  relacionamento: "Relacionamento",
  biblioteca_pericial: "Biblioteca Pericial",
  respostas_reutilizaveis: "Respostas",
  configuracoes: "Configurações",
  chat: "Chat",
};

/** Ordem de exibição no painel — mesma ordem do menu principal. */
export const MODULOS_ORDENADOS: ModuloSistema[] = [
  "dashboard",
  "processos",
  "hoje",
  "agenda",
  "financeiro",
  "relacionamento",
  "biblioteca_pericial",
  "respostas_reutilizaveis",
  "configuracoes",
  "chat",
];
