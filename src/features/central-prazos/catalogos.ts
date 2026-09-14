/**
 * Vocabulário editável de `central_tarefas.status` — mesmo princípio já
 * usado em Vara/Comarca (`ComboboxCatalogo` + `mesclarSugestoes`, ver
 * `src/features/processos/catalogos.ts`, reaproveitado aqui sem duplicar):
 * o valor salvo é sempre o próprio texto, sem tabela de catálogo à parte e
 * sem CHECK no banco. Esta semente garante que as 4 opções que ela pediu já
 * apareçam no dropdown desde o primeiro dia — a partir daí o catálogo cresce
 * sozinho com os valores distintos que ela for digitando.
 */
export const STATUS_TAREFA_SEED = [
  "Aguardando documentos",
  "Em estudo",
  "Em execução",
  "Aguardando agendamento",
] as const;
