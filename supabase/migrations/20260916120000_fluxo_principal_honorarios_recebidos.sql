-- ============================================================================
-- Fluxo Principal do Perito Judicial — fecha o trilho financeiro até
-- recebimento: `processos.honorarios_recebidos_em`.
-- ============================================================================
-- Decisão do Jeferson (16/09/2026): o trilho já existia no desenho e parava
-- em liberação por falta de um único dado. "Pedido de liberação protocolado
-- e sem recebimento confirmado" é dinheiro parado — pendência real, que se
-- perde de vista, ainda mais porque depósito judicial costuma demorar.
--
-- `date`, nullable, sem default — preenchida pela PERITA quando o dinheiro
-- efetivamente entra na conta. NUNCA inferida/gravada pelo sistema sozinho
-- (diferente de `liberacao_solicitada_em`, que é consequência direta de
-- protocolar o documento): não há nenhum evento no sistema que prove que o
-- dinheiro caiu, só ela sabe disso de verdade.
--
-- Uso: Central de Prazos — `liberacao_solicitada_em IS NOT NULL AND
-- honorarios_recebidos_em IS NULL` vira item "sem prazo" (não é vencimento,
-- é pendência que não expira) com providência "Conferir se o valor foi
-- liberado." Some sozinho quando ela preenche a data. Régua enxuta (Fluxo
-- Principal) — a etapa "Liberação" só fica "concluída" quando há
-- recebimento confirmado, não quando o pedido foi protocolado.
-- ============================================================================

alter table public.processos
  add column honorarios_recebidos_em date;

comment on column public.processos.honorarios_recebidos_em is
  'Data em que os honorários periciais efetivamente entraram na conta — preenchida pela perita quando o dinheiro cai, NUNCA inferida pelo sistema (não há como saber sem ela confirmar). Junto com liberacao_solicitada_em, fecha o trilho financeiro até recebimento: solicitada preenchida + recebidos vazio = pendência real na Central de Prazos.';
