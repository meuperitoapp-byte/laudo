-- ============================================================================
-- Fluxo Principal do Perito Judicial — 3 novos valores em laudos_gerados.tipo:
-- 'aceite_pericial', 'dados_deposito', 'agendamento_pericia'. Sem isso, os
-- compiladores desta fatia (compilar-aceite-pericial.ts, compilar-dados-
-- deposito.ts, compilar-agendamento-pericia.ts) não conseguem inserir linha
-- nenhuma em laudos_gerados — o INSERT falharia no CHECK.
-- ============================================================================
-- Faltou nesta migration junto com a 20260911130000 (schema de Honorários/
-- Agendamento) — só percebi ao montar os compiladores. Registrado: nenhum
-- código que depende disto foi commitado/deploiado antes desta migration
-- ser aplicada (mesma regra de sempre).
--
-- Honorários NÃO ganha tipo próprio aqui — de propósito, mesma decisão já
-- registrada no plano: não tem petição avulsa, só existe embutido na
-- Manifestação Consolidada (fatia futura, tipo 'manifestacao_inicial').
-- ============================================================================

alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia. Discrimina a forma de snapshot_respostas (aceite_pericial/dados_deposito/agendamento_pericia sempre gravam null — conteúdo vem direto de processos, sem forma própria de snapshot ainda).';
