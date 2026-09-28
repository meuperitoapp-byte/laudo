-- ============================================================================
-- Módulo de Relacionamento (CRM) — complemento de itens do §12 que faltavam
-- (revisão de fechamento do módulo, 30/09/2026). "Produto futuro": potencial
-- de adesão do Profissional a um futuro ecossistema/produto da PERICONS
-- destinado a profissionais — mesmo vocabulário de potencial já usado em
-- MEU PERITO (Baixo/Médio/Alto), sem inventar uma escala nova.
-- ============================================================================
alter table public.relacionamentos add column prof_produto_futuro_potencial text check (prof_produto_futuro_potencial in ('baixo', 'medio', 'alto'));
alter table public.relacionamentos add column prof_produto_futuro_observacao text;

comment on column public.relacionamentos.prof_produto_futuro_potencial is
  '§12 — só tipo = profissional. Potencial de adesão a um futuro produto/sistema do ecossistema profissional PERICONS.';
