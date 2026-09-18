-- ============================================================================
-- Assistência Técnica — Órgão de classe (CRM, CRO, CRP, CREFITO, COREN).
-- Pedido dela (23/09/2026), junto com renomear "Natureza do processo (tipo
-- de laudo)" pra "Área da demanda" na AT — a demanda pode envolver
-- profissionais de saúde de conselhos diferentes, não só medicina.
-- ============================================================================
-- Catálogo editável (mesmo padrão de escritorio_indicacao/vara/comarca):
-- texto livre no banco, sem CHECK — a tela sugere os 5 conselhos mais
-- comuns (seed em catalogos.ts), mas ela pode digitar outro se aparecer um
-- caso fora dessa lista.
-- ============================================================================

alter table public.processos
  add column orgao_classe text;

comment on column public.processos.orgao_classe is
  'Só Assistência Técnica. Conselho profissional do demandado/objeto da demanda (ex.: CRM, CRO, CRP, CREFITO, COREN) — catálogo editável, texto livre sem CHECK, mesmo padrão de escritorio_indicacao.';
