/**
 * Central de Gestão de Prazos e Tarefas — fatia 1 (painel "o que fazer
 * hoje", só leitura, sem cadastro). Ver docs/plano-modulo-central-prazos.md.
 *
 * `NivelUrgencia` NÃO é uma coluna de banco — não existe tabela de tarefa
 * ainda (fatia 2+). É um valor calculado em `regras.ts` a partir do que já
 * existe em cada tabela de origem (`agregador.ts`).
 */
export type NivelUrgencia = "critica" | "urgente" | "alta" | "atencao" | "programada" | "sem_prazo";

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
    | "nomeacao_sem_decisao";
  titulo: string;
  subtitulo: string | null;
  /** Texto fixo por categoria (ver rotulos.ts) — nunca vazio, nunca digitado por ela nesta fatia. */
  providencia: string;
  nivel: NivelUrgencia;
  /** "YYYY-MM-DD" — só quando a categoria tem prazo de verdade (hoje, só ciclo aberto). */
  prazo: string | null;
  /** Data só pra exibir (ex.: "entregue em"), nunca usada pra calcular nível. */
  dataContexto: { rotulo: string; valor: string } | null;
  /** Data usada só pro desempate dentro do mesmo nível — nunca pra decidir o nível em si. */
  ordenacao: string;
  href: string;
}
