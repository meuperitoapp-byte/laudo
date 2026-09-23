-- ============================================================================
-- Análise de Viabilidade — caso_necessidade_especialista.resolvido_em (§26)
-- ============================================================================
-- Gap encontrado antes da fatia 6: diferente de caso_documentos_faltantes e
-- caso_oportunidades_probatorias (fontes 12 e 13 da Central de Prazos), esta
-- tabela nasceu sem `resolvido_em` na migration original — só tem `status`
-- (texto livre). O spec (§26) diz "Se Necessário → gera tarefa", mesma lógica
-- das outras duas, então precisa do mesmo campo pra virar fonte 14 do
-- agregador sem depender de parsear texto livre pra saber se está concluído.

alter table public.caso_necessidade_especialista
  add column resolvido_em timestamptz;

comment on column public.caso_necessidade_especialista.resolvido_em is
  'Preenchido manualmente quando a necessidade de especialista é resolvida (mesmo padrão de caso_documentos_faltantes.resolvido_em e caso_oportunidades_probatorias.resolvido_em) — nunca inferido do texto livre de `status`.';
