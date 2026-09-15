-- ============================================================================
-- Central de Gestão de Prazos e Tarefas — fatia 3, parte "documentos
-- pendentes". Ver docs/plano-modulo-central-prazos.md §6.2.
-- ============================================================================
-- Investigação anterior (17/09/2026) confirmou que nada no banco hoje
-- representa "processo aguardando documentos do advogado" — `situacao_
-- processo` é pipeline fechado de etapas procedurais (não é uma etapa a
-- mais, convive com qualquer uma delas) e `documentos.ilegivel_insuficiente`
-- é sobre documento que já existe e está ruim, conceito diferente de
-- documento que ainda não chegou.
--
-- `documentos_solicitados_em` (date, nullable): preenchida por ela quando
-- pede algo ao advogado, LIMPA quando os documentos chegam — nunca inferida
-- (não existe evento no sistema que prove chegada de documento físico/
-- digital fora do upload manual, e nem todo documento pedido é upado aqui).
-- Data em vez de booleano de propósito: com data dá pra dizer há quanto
-- tempo está pendente, que é o que torna o lembrete útil (mesmo raciocínio
-- de `liberacao_solicitada_em`/`honorarios_recebidos_em`).
--
-- `documentos_solicitados_descricao` (text, nullable): o que foi pedido —
-- sem isso o lembrete na Central não diz o que cobrar, só que "algo" está
-- pendente.
-- ============================================================================

alter table public.processos
  add column documentos_solicitados_em date,
  add column documentos_solicitados_descricao text;

comment on column public.processos.documentos_solicitados_em is
  'Data em que ela solicitou documentos ao advogado/parte. Preenchida e limpa manualmente por ela — nunca inferida. Null = nada pendente. Independente de situacao_processo (convive com qualquer etapa).';
comment on column public.processos.documentos_solicitados_descricao is
  'Texto curto do que foi solicitado (ex.: "exames de imagem atualizados"). Preenchido junto com documentos_solicitados_em.';
