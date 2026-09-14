-- ============================================================================
-- Fluxo Principal do Perito Judicial — fatia 6: trilho financeiro até
-- liberação (nº23 da Biblioteca de Expedientes Periciais, Pedido de
-- Liberação dos Honorários Periciais). Ver docs/plano-modulo-fluxo-principal.md §5.1/§6.
-- ============================================================================
-- `liberacao_forma`: "mediante [alvará/transferência]" do modelo. Coluna
-- própria, NÃO reaproveita `deposito_forma_disponibilizacao` — são momentos
-- diferentes do processo (disponibilização do depósito vs. liberação final)
-- e podem divergir num caso real (decisão do Jeferson, 11/09/2026).
--
-- `liberacao_solicitada_em`: gravado DIRETO ao protocolar o Pedido de
-- Liberação (não como sugestão) — diferente do caso de
-- `aceitou_nomeacao='encargo_declinado'` (que exigiu sugestão porque
-- disputava um campo já existente, com leitura concorrente e vocabulário
-- que era da Dra. Fernanda escolher), aqui é um campo NOVO, criado só pra
-- este fato — nenhuma ambiguidade, nenhuma leitura concorrente. Mesmo
-- critério do `aceitou_nomeacao='sim'` ao protocolar o Aceite (decisão do
-- Jeferson, 14/09/2026).
--
-- Todo o resto do documento (data/ID do laudo, valor) reaproveita dado que
-- já existe (`laudos_gerados` protocolado + `deposito_valor`) — zero coluna
-- nova além destas duas.
-- ============================================================================

alter table public.processos
  add column liberacao_forma text
    check (liberacao_forma in ('alvara', 'transferencia', 'outro')),
  add column liberacao_solicitada_em timestamptz;

comment on column public.processos.liberacao_forma is
  '"Mediante [alvará/transferência]" do Modelo de Pedido de Liberação dos Honorários (nº23 da Biblioteca de Expedientes Periciais). Independente de deposito_forma_disponibilizacao (disponibilização do DEPÓSITO, não da liberação final) — os dois podem divergir no mesmo processo. Trava de exposição dos dados bancários (configuracoes): só ''transferencia'' permite incluí-los no documento gerado; ''alvara''/''outro'' excluem sempre.';
comment on column public.processos.liberacao_solicitada_em is
  'Gravado ao protocolar o Pedido de Liberação dos Honorários (tipo=''pedido_liberacao'' em laudos_gerados) — consequência direta do ato, não inferência; null = liberação ainda não solicitada.';

alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia',
    'manifestacao_inicial', 'impossibilidade_assumir', 'escusa_declinio_pericial',
    'nao_comparecimento', 'pedido_liberacao'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial | nao_comparecimento | pedido_liberacao. Discrimina a forma de snapshot_respostas.';
