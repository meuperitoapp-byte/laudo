-- ============================================================================
-- Lote de melhorias da Dra. Fernanda (24/09/2026) — 3 campos aditivos em
-- processos, todos texto livre opcional, sem relação entre si além de
-- serem pedidos no mesmo lote:
--
-- anotacoes: campo de observações importantes do caso (pedido da
-- secretária) — mostrado no cartão de identificação do processo.
--
-- estrategia_pericial_responsavel: quem deve executar a reunião de
-- Estratégia pericial (ex.: "Secretária") — alimenta a Central de Prazos/
-- Agenda (fonte 11, ver central-prazos/agregador.ts), que hoje sempre
-- manda `responsavel: null` pra essa fonte.
--
-- analise_contestacao_observacoes: campo de texto pra ela digitalizar o
-- que identificou ao estudar a contestação — a etapa "Análise da
-- contestação" só tinha upload de arquivo (AnexoEtapaAtPanel), sem lugar
-- pra anotação própria.
-- ============================================================================

alter table public.processos
  add column anotacoes                          text,
  add column estrategia_pericial_responsavel     text,
  add column analise_contestacao_observacoes     text;

comment on column public.processos.anotacoes is
  'Observações/anotações livres sobre o caso — pedido da secretária, mostrado no cartão de identificação.';
comment on column public.processos.estrategia_pericial_responsavel is
  'Responsável pela reunião de Estratégia pericial (texto livre, mesmo catálogo de responsável usado em outros lugares) — alimenta a Central de Prazos/Agenda.';
comment on column public.processos.analise_contestacao_observacoes is
  'Anotações da perita ao estudar a contestação — complementa o anexo de arquivo já existente (AnexoEtapaAtPanel).';
