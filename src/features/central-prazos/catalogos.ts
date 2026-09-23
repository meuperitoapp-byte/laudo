/**
 * Vocabulário editável de `central_tarefas.status` — mesmo princípio já
 * usado em Vara/Comarca (`ComboboxCatalogo` + `mesclarSugestoes`, ver
 * `src/features/processos/catalogos.ts`, reaproveitado aqui sem duplicar):
 * o valor salvo é sempre o próprio texto, sem tabela de catálogo à parte e
 * sem CHECK no banco. Semente revisada por ela (item #1 da fila de
 * melhorias, 19-20/09/2026) — a partir daqui o catálogo cresce sozinho com
 * os valores distintos que ela for digitando. Obrigatório só pra tipo=
 * 'tarefa' (opcional pra evento — ver migration 20260920120000).
 */
export const STATUS_TAREFA_SEED = [
  "Aguardando documentos",
  "Liberado para agendar",
  "Agendado",
  "Em estudo",
  "Finalizado",
  "Falar com advogado",
] as const;

/**
 * Vocabulário editável de `central_tarefas.responsavel` — mesmo princípio
 * acima. "Secretária" e "CEO" adicionados em 30/09/2026 junto com a
 * separação visual da Agenda por responsável (ver rotulos.ts/agregador.ts) —
 * cresce sozinho a partir do que for digitado além disso.
 */
export const RESPONSAVEL_TAREFA_SEED: readonly string[] = ["Dra. Fernanda", "Secretária", "CEO", "Financeiro"];
