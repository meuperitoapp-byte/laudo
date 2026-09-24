-- ============================================================================
-- Observações financeiras (24/09/2026, feedback dela) — "Vencimento do
-- contrato" é uma data única, rígida demais pra casos de AT com
-- parcelamento ou acordo diferente do padrão. Mantém a data (alimenta o
-- lembrete automático da Central de Prazos, Boleto/Transferência) e
-- acrescenta um campo livre pro financeiro anotar qualquer detalhe que não
-- caiba nela.
-- ============================================================================

alter table public.processos
  add column observacoes_financeiras text;

comment on column public.processos.observacoes_financeiras is
  'Observações livres do financeiro sobre o pagamento (ex.: parcelamento, acordo específico) — complementa honorarios_vencimento, que continua alimentando o lembrete automático da Central de Prazos.';
