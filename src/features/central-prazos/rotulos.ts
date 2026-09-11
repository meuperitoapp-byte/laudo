/**
 * Rótulos e providências fixas da Central de Prazos e Tarefas — fatia 1.
 * Camada de apresentação; o vocabulário canônico dos níveis é `tipos.ts`.
 */

import type { NivelUrgencia, ItemPainel } from "./tipos";

export const NIVEL_ROTULOS: Record<NivelUrgencia, string> = {
  critica: "Crítica",
  urgente: "Urgente",
  alta: "Alta",
  atencao: "Atenção",
  programada: "Programada",
  sem_prazo: "Sem prazo",
};

/**
 * Variante do `Selo` compartilhado (`components/ui/badge.tsx`) por nível —
 * cobre 5 dos 6 porque o componente só tem 3 cores de estado (sucesso/
 * atenção/erro) mais neutro, e a régua da Dra. Fernanda pede 4 cores
 * distintas (verde/amarelo/laranja/vermelho). "Urgente" (laranja) fica de
 * fora deste mapa de propósito — não existe variante equivalente sem
 * acrescentar uma cor nova ao sistema aprovado (ver plano, seção "Uma
 * decisão de estilo"); a tela renderiza "urgente" com um estilo próprio,
 * âmbar cheio, mais forte que "alta" sem inventar uma família de cor nova.
 */
export const NIVEL_SELO_VARIANTE: Partial<Record<NivelUrgencia, "sucesso" | "atencao" | "erro" | "neutro">> = {
  critica: "erro",
  alta: "atencao",
  atencao: "sucesso",
  programada: "neutro",
  sem_prazo: "neutro",
};

/** Classe do badge bespoke de "Urgente" — âmbar cheio (mais forte que o "atencao" claro do Selo), sem criar cor nova. */
export const URGENTE_BADGE_CLASSE =
  "bg-ambar-400 text-nevoa-900 dark:bg-ambar-600 dark:text-nevoa-50";

/**
 * "Próxima Providência" — texto fixo por categoria de item (fatia 1, sem
 * cadastro). Editar por item é fatia futura (precisa de onde guardar a
 * edição — ver plano §4).
 */
export const PROVIDENCIA_POR_CATEGORIA: Record<ItemPainel["categoria"], string> = {
  ciclo_aberto: "Responder os pontos pendentes e gerar as saídas cabíveis.",
  laudo_sem_protocolar: "Protocolar o laudo já gerado.",
  at_sem_entrega: "Entregar o parecer/quesitos ao advogado.",
  at_entregue_sem_protocolo: "Confirmar com o advogado se já protocolou.",
  documento_ilegivel: "Solicitar documento legível ao apresentante.",
  nomeacao_sem_decisao: "Decidir se aceita a nomeação.",
};
