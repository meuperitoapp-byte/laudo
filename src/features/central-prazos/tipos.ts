/**
 * Central de Gestão de Prazos e Tarefas. Ver docs/plano-modulo-central-prazos.md.
 *
 * `NivelUrgencia` mora em `@/types/enums` desde a fatia 2 — deixou de ser só
 * um valor calculado (`regras.ts`) e passou a ser TAMBÉM o vocabulário de
 * `central_tarefas.nivel_urgencia_manual` (a correção dela, que sempre vence
 * o cálculo). Reexportado aqui pra não quebrar os imports existentes
 * (`import type { NivelUrgencia } from "./tipos"`).
 */
import type { NivelUrgencia } from "@/types/enums";
export type { NivelUrgencia };

/**
 * Um item da lista do painel. `prazo` é a ÚNICA data usada pra calcular
 * `nivel` — nunca confundir com `dataContexto` (ex.: "entregue em X"), que é
 * só informativa e não participa da régua de cor nem da ordenação por
 * urgência.
 */
export interface ItemPainel {
  /** Único na lista inteira — "<categoria>-<id da linha de origem>". */
  id: string;
  categoria:
    | "ciclo_aberto"
    | "laudo_sem_protocolar"
    | "at_sem_entrega"
    | "at_entregue_sem_protocolo"
    | "documento_ilegivel"
    | "nomeacao_sem_decisao"
    | "agendamento_marcado"
    | "liberacao_sem_recebimento"
    | "tarefa_manual"
    | "documentos_pendentes"
    | "honorarios_marco_judicial"
    | "honorarios_atraso_at"
    | "reuniao_estrategia_pericial"
    | "viabilidade_documento_faltante"
    | "viabilidade_oportunidade_probatoria"
    | "viabilidade_necessidade_especialista";
  titulo: string;
  subtitulo: string | null;
  /** Texto fixo por categoria (ver rotulos.ts) pras fontes automáticas; pra `tarefa_manual` é a descrição que ela mesma digitou (ou um fallback genérico quando em branco). Nunca vazio. */
  providencia: string;
  nivel: NivelUrgencia;
  /** "YYYY-MM-DD" — só quando a categoria tem prazo de verdade (ciclo aberto, nomeação sem decisão com prazo de manifestação, agendamento marcado). */
  prazo: string | null;
  /** Data só pra exibir (ex.: "entregue em"), nunca usada pra calcular nível. */
  dataContexto: { rotulo: string; valor: string } | null;
  /** Data usada só pro desempate dentro do mesmo nível — nunca pra decidir o nível em si. */
  ordenacao: string;
  href: string;
}
