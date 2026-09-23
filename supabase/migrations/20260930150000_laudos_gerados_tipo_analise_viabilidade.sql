-- ============================================================================
-- laudos_gerados.tipo — novo valor 'analise_viabilidade' (§38 do spec)
-- ============================================================================
-- Fatia 8 da Análise de Viabilidade: geração do PDF/Word final reaproveita
-- a MESMA tabela de versionamento já usada por laudo/pareceres/manifestações
-- (mesmo bucket, mesmo padrão de snapshot + storage_path_pdf/docx) — só
-- precisa do tipo novo no CHECK.

alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia',
    'manifestacao_inicial', 'impossibilidade_assumir', 'escusa_declinio_pericial',
    'nao_comparecimento', 'pedido_liberacao',
    'analise_viabilidade'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial | nao_comparecimento | pedido_liberacao | analise_viabilidade. Discrimina a forma de snapshot_respostas.';
