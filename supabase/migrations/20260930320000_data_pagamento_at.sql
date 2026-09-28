-- ============================================================================
-- Data de pagamento da Assistência Técnica (25/09/2026) — feedback do
-- Jeferson: o Gráfico de Faturamento mensal aparecia vazio porque a tabela
-- `movimentacoes_financeiras` (ledger manual) nunca foi usada — o
-- recebimento real de AT é registrado só como `situacao_financeira = 'Pago'`,
-- SEM data nenhuma. Sem data, é impossível saber em que mês entrou.
--
-- Backfill: pros processos já marcados "Pago" hoje, usa `updated_at::date`
-- como aproximação (não é a data real do pagamento, é a melhor informação
-- disponível) — sem isso, os 13 processos de AT já pagos ficariam de fora
-- de QUALQUER relatório mensal pra sempre. Documentado aqui pra não
-- confundir com dado real no futuro.
-- ============================================================================

alter table public.processos
  add column data_pagamento_at date;

comment on column public.processos.data_pagamento_at is
  'Data em que o pagamento da Assistência Técnica foi confirmado — alimenta o Gráfico de Faturamento mensal. Preenchida manualmente junto com situacao_financeira = Pago.';

update public.processos
set data_pagamento_at = updated_at::date
where tipo_trabalho = 'assistencia_tecnica'
  and situacao_financeira = 'Pago'
  and data_pagamento_at is null;
