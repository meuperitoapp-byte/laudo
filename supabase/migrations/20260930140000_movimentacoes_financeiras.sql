-- ============================================================================
-- Financeiro — unifica Saídas (despesas) num ledger único de entrada/saída
-- ============================================================================
-- Pedido do financeiro dela (21/09/2026, repassado pelo Jeferson): um lugar
-- único pra lançar TODA movimentação (entrada e saída), com data de
-- pagamento, processo vinculado, valor, conta (Asaas/Inter/Banco do Brasil),
-- categoria e observações — pra bater com o extrato bancário. Renomeia
-- `despesas` (que só cobria saída) pra `movimentacoes_financeiras` e
-- acrescenta os campos que faltavam, preservando os dados já existentes.
--
-- Decisões confirmadas com ela (via Jeferson):
-- - Entrada é SEMPRE vinculada a um processo específico (Judicial ou AT);
--   saída pode ou não ter processo (Impostos/Mensalidade de sistema não têm).
-- - 100% manual nesta primeira versão — ela/financeiro lançam direto, sem
--   nenhuma automação a partir de honorarios_recebidos_em/situacao_financeira.
-- - Categoria é um catálogo ÚNICO cobrindo os dois lados (mesmo padrão já
--   usado em despesas.categoria: texto livre com sugestões, sem CHECK).
-- - Conta também é catálogo editável (Asaas, Inter, Banco do Brasil hoje —
--   ela pode digitar outra se precisar).

alter table public.despesas rename to movimentacoes_financeiras;

alter table public.movimentacoes_financeiras
  rename column descricao to observacoes;

alter table public.movimentacoes_financeiras
  alter column observacoes drop not null;

alter table public.movimentacoes_financeiras
  add column tipo text not null default 'saida' check (tipo in ('entrada', 'saida')),
  add column conta text,
  add column processo_id uuid references public.processos(id) on delete cascade;

alter table public.movimentacoes_financeiras
  alter column tipo drop default;

comment on table public.movimentacoes_financeiras is
  'Ledger manual de entrada/saída pra conciliação bancária/contábil — data, tipo, categoria, conta, processo vinculado (obrigatório em entrada, opcional em saída, checado na aplicação), valor, observações. Substitui `despesas` (só cobria saída); dados antigos preservados com tipo=saida.';
comment on column public.movimentacoes_financeiras.tipo is
  'entrada ou saida. Entrada sempre tem processo_id (checado na aplicação, não no banco). Sem default depois da migration — toda linha nova precisa informar.';
comment on column public.movimentacoes_financeiras.conta is
  'Catálogo editável (Asaas, Inter, Banco do Brasil hoje) — mesmo padrão de categoria, texto livre sem CHECK.';
comment on column public.movimentacoes_financeiras.processo_id is
  'Processo/serviço a que a movimentação se refere. Obrigatório pra tipo=entrada, opcional pra tipo=saida (ex.: Impostos, Mensalidade de sistema não têm processo). on delete cascade — mesmo padrão de toda tabela ligada a processos (ver excluirProcesso).';
comment on column public.movimentacoes_financeiras.observacoes is
  'Antiga "descricao" de despesas — agora opcional (entrada com processo vinculado já se identifica pelo processo, não precisa de texto obrigatório).';

alter index idx_despesas_data rename to idx_movimentacoes_financeiras_data;
alter index idx_despesas_categoria rename to idx_movimentacoes_financeiras_categoria;
create index idx_movimentacoes_financeiras_processo on public.movimentacoes_financeiras (processo_id);
create index idx_movimentacoes_financeiras_tipo on public.movimentacoes_financeiras (tipo);

alter policy "despesas_full_access" on public.movimentacoes_financeiras
  rename to "movimentacoes_financeiras_full_access";
