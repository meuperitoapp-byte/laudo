-- ============================================================================
-- processos — Situação, acompanhamento e dados financeiros
-- ============================================================================
-- Lote de melhorias da Dra. Fernanda (baseado no sistema de referência que ela
-- usa hoje). Acrescenta ao cadastro do processo:
--
--   * situacao_processo      — em que ponto do fluxo o processo está (ex.:
--                              "Aguardando Perícia", "Aguardando Montagem de
--                              Laudo"). Texto livre + catálogo que cresce
--                              sozinho a partir dos valores já usados, igual a
--                              vara_numero/comarca_subsecao. A lista-semente
--                              vive no código (src/features/processos/catalogos.ts).
--   * situacao_financeira    — situação financeira do processo (ex.: "Aguardando
--                              Pagamento de Honorários", "Pago"). Mesmo padrão.
--   * valor_processo         — valor da causa.
--   * honorario_apresentado  — honorário apresentado (proposto pela perita).
--   * honorario_arbitrado    — honorário arbitrado (fixado pelo juízo).
--   * justica_gratuita       — 'sim' / 'nao' (S/N no formulário).
--   * aceitou_nomeacao       — 'sim' / 'nao' / 'destituida' (S/N/D — "destituída
--                              do cargo").
--   * url_processo           — link para o processo no sistema do tribunal.
--   * acao_objeto            — Ação / Objeto da Perícia ou Assistência. Campo
--                              separado da Natureza do Processo (tipo_laudo_id):
--                              a Natureza define o template do laudo; este aqui
--                              descreve a ação/objeto em texto livre + catálogo.
--
-- Todas nullable e válidas para os dois tipos de trabalho (perícia judicial e
-- assistência técnica) — nenhuma é obrigatória.
-- ============================================================================

alter table public.processos
  add column situacao_processo      text,
  add column situacao_financeira    text,
  add column valor_processo         numeric(14, 2),
  add column honorario_apresentado  numeric(14, 2),
  add column honorario_arbitrado    numeric(14, 2),
  add column justica_gratuita       text check (justica_gratuita in ('sim', 'nao')),
  add column aceitou_nomeacao       text check (aceitou_nomeacao in ('sim', 'nao', 'destituida')),
  add column url_processo           text,
  add column acao_objeto            text;

comment on column public.processos.situacao_processo is
  'Ponto do fluxo em que o processo está. Texto livre; o catálogo de valores cresce sozinho a partir dos valores distintos já usados + lista-semente em src/features/processos/catalogos.ts.';
comment on column public.processos.situacao_financeira is
  'Situação financeira do processo. Mesmo padrão de catálogo livre de situacao_processo.';
comment on column public.processos.honorario_apresentado is
  'Honorário apresentado (proposta da perita).';
comment on column public.processos.honorario_arbitrado is
  'Honorário arbitrado (valor fixado pelo juízo).';
comment on column public.processos.aceitou_nomeacao is
  '''sim'' / ''nao'' / ''destituida'' (destituída do cargo).';
comment on column public.processos.acao_objeto is
  'Ação / Objeto da Perícia ou Assistência — texto livre + catálogo. Separado de tipo_laudo_id (Natureza do Processo), que define o template do laudo.';
