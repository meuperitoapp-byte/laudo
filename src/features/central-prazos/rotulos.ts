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
  agendamento_marcado: "Confirmar preparação para a perícia agendada.",
  liberacao_sem_recebimento: "Conferir se o valor foi liberado.",
  /** Fallback só — na prática, a providência de uma tarefa manual é a descrição que ela mesma escreveu (ver agregador.ts). */
  tarefa_manual: "Ver detalhes da tarefa.",
  /** Fallback só — quando ela preencheu o que foi pedido, esse texto vira a providência (ver agregador.ts). */
  documentos_pendentes: "Cobrar documentos com o advogado/parte.",
  honorarios_marco_judicial: "Confirmar se o marco combinado foi cumprido.",
  honorarios_atraso_at: "Cobrar o pagamento pendente.",
  reuniao_estrategia_pericial: "Preparar e realizar a reunião com o advogado.",
  viabilidade_documento_faltante: "Cobrar o documento com quem provavelmente possui.",
  viabilidade_oportunidade_probatoria: "Executar a providência probatória registrada.",
};

/**
 * Agrupamento por categoria pra Agenda (módulo novo, 23/09/2026) — mesma
 * lista de fontes do painel de "Hoje", só reorganizada em 4 grupos
 * (Perícias | Reuniões | Prazos | Tarefas) em vez de nível de urgência.
 * "Calendário" não é um grupo à parte — é a visão cronológica em si,
 * que junta todos os 4. Sem grupo "Sem prazo": Agenda só mostra item com
 * data real (calendário não plota o que não tem quando).
 */
export const GRUPO_AGENDA_ROTULOS = {
  pericias: "Perícias",
  reunioes: "Reuniões",
  prazos: "Prazos",
  tarefas: "Tarefas",
} as const;
export type GrupoAgenda = keyof typeof GRUPO_AGENDA_ROTULOS;

export const GRUPO_AGENDA_POR_CATEGORIA: Record<ItemPainel["categoria"], GrupoAgenda> = {
  agendamento_marcado: "pericias",
  reuniao_estrategia_pericial: "reunioes",
  tarefa_manual: "tarefas",
  ciclo_aberto: "prazos",
  laudo_sem_protocolar: "prazos",
  at_sem_entrega: "prazos",
  at_entregue_sem_protocolo: "prazos",
  documento_ilegivel: "prazos",
  nomeacao_sem_decisao: "prazos",
  liberacao_sem_recebimento: "prazos",
  documentos_pendentes: "prazos",
  honorarios_marco_judicial: "prazos",
  honorarios_atraso_at: "prazos",
  viabilidade_documento_faltante: "prazos",
  viabilidade_oportunidade_probatoria: "prazos",
};
