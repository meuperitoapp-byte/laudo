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

// `central_tarefas.responsavel` deixou de usar catálogo de texto livre
// (30/09/2026) — o campo agora é o SelectResponsavel fechado, alimentado por
// listarNomesResponsaveis() (só logins reais), pra não dar margem de erro
// com nomes de setor que não existem como login (CEO/Financeiro/Assessor/
// Atendimento, catálogo antigo removido daqui).
