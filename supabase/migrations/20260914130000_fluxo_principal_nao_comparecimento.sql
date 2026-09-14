-- ============================================================================
-- Fluxo Principal do Perito Judicial — fatia seguinte: novo valor em
-- laudos_gerados.tipo pra Comunicação de Não Comparecimento ao Ato Pericial
-- (nº17 da Biblioteca de Expedientes Periciais).
-- ============================================================================
-- Documento pequeno (1 página, sem checklist) — data/horário/horário de
-- chegada do perito/tempo de espera/pessoas presentes são campos digitados
-- na hora de gerar e congelados só no snapshot da versão (mesmo padrão do
-- nº12/nº13) — NENHUMA coluna nova em `processos`. Em especial,
-- `agendamento_data`/`agendamento_horario` NÃO são sobrescritos por este
-- documento: a perícia que não aconteceu continua com a data original
-- registrada, e a linha do tempo mostra os dois eventos separados (o
-- agendamento e a comunicação de não comparecimento) — não um substituindo
-- o outro.
-- ============================================================================

alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia',
    'manifestacao_inicial', 'impossibilidade_assumir', 'escusa_declinio_pericial',
    'nao_comparecimento'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial | nao_comparecimento. Discrimina a forma de snapshot_respostas.';
