-- ============================================================================
-- Análise de Viabilidade: recomendação técnica simplificada (§30) + orçamento
-- na Pós-entrega (§39). Feedback da Dra. Fernanda em prints anotados
-- (30/09/2026): o campo curto "recomendacao" (combobox de catálogo) some,
-- fica só a justificativa em texto corrido. Na Pós-entrega, quando há
-- orçamento enviado, precisa da data de envio pra Central de Prazos lembrar
-- em D+7 se ainda não houve contratação.
-- ============================================================================

alter table public.analises_viabilidade
  drop column recomendacao;

alter table public.analises_viabilidade
  add column pos_entrega_orcamento_enviado    text check (pos_entrega_orcamento_enviado in ('sim', 'nao')),
  add column pos_entrega_orcamento_enviado_em date;

comment on column public.analises_viabilidade.pos_entrega_orcamento_enviado is
  'Orçamento enviado ao cliente após reunião de apresentação do resultado (§39).';
comment on column public.analises_viabilidade.pos_entrega_orcamento_enviado_em is
  'Data de envio do orçamento — Central de Prazos lembra em D+7 se processos.data_contratacao ainda estiver vazio.';
