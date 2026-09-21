-- ============================================================================
-- Análise de Viabilidade — Limitações documentais (§10 do spec)
-- ============================================================================
-- Gap encontrado ao construir a fatia 2 (21/09/2026): a migration original
-- (20260926120000) cobriu §7-9 e §11+ mas pulou §10 — não é uma entidade
-- repetível como as outras (o spec não tem "+ Adicionar limitação", é
-- "permitir marcar" uma lista fixa + UMA classificação de impacto pra
-- análise inteira), e não está na tabela de reutilização do §40 (não é
-- consumida por nenhum módulo futuro) — por isso vira colunas no hub
-- `analises_viabilidade`, não uma tabela `caso_*` nova.

alter table public.analises_viabilidade
  add column limitacoes_documentais jsonb,
  add column limitacoes_impacto text
    check (limitacoes_impacto in ('nenhum_relevante', 'parcial', 'importante', 'impede_conclusao')),
  add column limitacoes_justificativa text;

comment on column public.analises_viabilidade.limitacoes_documentais is
  'Multisseleção de vocabulário FECHADO (§10): prontuário incompleto, documento ilegível, ausência de horário/evolução/identificação/exame, registro insuficiente, documentação unilateral, divergência documental, impossibilidade de verificar fato, outro.';
comment on column public.analises_viabilidade.limitacoes_impacto is
  '§10. Se impede_conclusao e a conclusão escolhida (analises_viabilidade.conclusao) for definitiva, a aplicação exige limitacoes_justificativa preenchida (validação de app, não CHECK — mesmo padrão já usado em risco_fundamentacao).';
