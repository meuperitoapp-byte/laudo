-- ============================================================================
-- Fluxo Principal do Perito Judicial — novo valor em processos.aceitou_nomeacao:
-- 'encargo_declinado'. Fecha o ponto em aberto do plano (§5.2): protocolar o
-- nº13 (Escusa/Declínio do Encargo Já Aceito) precisa gravar um fato que os
-- 3 valores existentes não cobrem — ela aceitou e DEPOIS devolveu o encargo.
-- ============================================================================
-- Por que não reaproveitar 'destituida': esse valor descreve remoção PELO
-- JUÍZO, não devolução voluntária por impedimento superveniente — encaixar
-- ali seria o mesmo erro que forçar "Finalizado" em situacao_processo pra um
-- encargo recusado (decisão do Jeferson, 11/09/2026: não força no valor mais
-- próximo quando o fato é outro).
--
-- Nome do valor descreve o FATO (encargo devolvido depois de aceito), não o
-- documento que o formaliza (escusa_declinio_pericial) — se um dia existir
-- outro expediente com o mesmo efeito, o valor continua certo (decisão do
-- Jeferson).
--
-- 'nao' já cobre o nº12 (recusa ANTES de aceitar) — não precisa de valor
-- novo pra esse caso.
-- ============================================================================

alter table public.processos
  drop constraint processos_aceitou_nomeacao_check;
alter table public.processos
  add constraint processos_aceitou_nomeacao_check
    check (aceitou_nomeacao in ('sim', 'nao', 'destituida', 'encargo_declinado'));

comment on column public.processos.aceitou_nomeacao is
  '''sim''/''nao''/''destituida'' (S/N/D — "destituída do cargo", remoção pelo juízo) + ''encargo_declinado'' (aceitou e depois devolveu o encargo por impedimento superveniente — nº13 da Biblioteca de Expedientes Periciais, distinto de ''destituida'' porque é devolução voluntária, não remoção). Nenhum dos 4 valores é gravado sozinho pelo sistema fora do fluxo de sugestão pós-protocolo (ver fluxo-principal/regras.ts).';
