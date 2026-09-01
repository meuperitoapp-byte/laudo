-- ============================================================================
-- Campos de "quem solicitou" para o fluxo de Assistência Técnica.
-- ============================================================================
-- O cadastro de processo não tinha nenhum campo de solicitante. O documento
-- gerado para tipo_trabalho = 'assistencia_tecnica' (Parecer Técnico) leva no
-- cabeçalho quem contratou / a parte assistida e o advogado(a)/escritório
-- (mesma nomenclatura dos modelos internos da biblioteca de AT, ex.:
-- 05_Analise_Viabilidade_Tecnico_Pericial). Ambos nullable e só usados nesse
-- fluxo — Perícia Judicial não os lê.
-- ============================================================================

alter table public.processos
  add column cliente_parte_assistida  text,
  add column advogado_escritorio      text;

comment on column public.processos.cliente_parte_assistida is
  'Só assistencia_tecnica: quem contratou / parte assistida. Vai no cabeçalho do Parecer Técnico.';
comment on column public.processos.advogado_escritorio is
  'Só assistencia_tecnica: advogado(a) / escritório da parte assistida.';
