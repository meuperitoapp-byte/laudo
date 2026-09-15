-- ============================================================================
-- Dashboard/relatórios — campo de origem de indicação, pra responder "qual
-- escritório é mais rentável". Ver docs/plano-dashboard-analitico.md.
-- ============================================================================
-- Diferente de `processos.advogado_escritorio` (só assistencia_tecnica: quem
-- CONTRATOU a parte assistida naquele serviço) — este é o escritório/advogado
-- que INDICOU ou RECOMENDOU o caso, útil pros dois tipos de trabalho:
--   - Perícia Judicial: ela é nomeada pelo juiz, não contratada por advogado
--     nenhum, então não existia até hoje nenhum campo pra registrar quem
--     recomendou o caso a ela.
--   - Assistência Técnica: o advogado que contratou pode não ser o mesmo que
--     originalmente indicou/recomendou o trabalho dela.
-- Confirmado pelo Jeferson (19/09/2026): é o dado que sustenta a análise
-- "quais escritórios de indicação trazem mais retorno", ligada ao papel de
-- setor comercial já mencionado (acompanha os advogados que mais indicam).
--
-- text livre, sem CHECK — catálogo editável (mesmo padrão de Vara/Comarca/
-- Ação-Objeto: ComboboxCatalogo + mesclarSugestoes, cresce sozinho com o que
-- ela digitar, sem tela de administração).
-- ============================================================================

alter table public.processos
  add column escritorio_indicacao text;

comment on column public.processos.escritorio_indicacao is
  'Escritório/advogado que indicou ou recomendou o caso a ela — distinto de advogado_escritorio (assistencia_tecnica: quem contratou). Vale pros dois tipos de trabalho. Usado para análise de rentabilidade por origem de indicação.';
