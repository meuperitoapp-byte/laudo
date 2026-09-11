-- ============================================================================
-- Fluxo Principal do Perito Judicial — fatia seguinte (schema): trilho de
-- Honorários e trilho de Agendamento. Ver docs/plano-modulo-fluxo-principal.md.
-- ============================================================================
-- Continua em `processos` (mesma família de dado das colunas da migration
-- 20260911120000 — nomeação/aceite/depósito) — dois blocos independentes:
--
--   1) HONORÁRIOS — vocabulário literal da seção III do modelo de
--      Manifestação Consolidada. `honorario_apresentado`/`honorario_arbitrado`
--      já existem (migration 20260829120000) e cobrem "valor proposto" e
--      "valor arbitrado" — não duplicados aqui. O que faltava era a situação
--      (nao fixado / concordância / insuficiente-majoração / impugnado /
--      justiça gratuita) e os dois campos de estimativa técnica.
--
--   2) AGENDAMENTO — vocabulário literal do Modelo de Comunicação de
--      Agendamento da Perícia (seção II: Data/Horário/Local + seção IV:
--      Orientações ao Periciado). A seção V ("Controle Operacional") do
--      modelo tinha 4 checkboxes; só um deles entra nesta fatia
--      (`agendamento_deposito_previo_exigido`) — os outros 3 (assistentes
--      técnicos cadastrados, partes intimadas, confirmação pré-pericial)
--      ficaram de fora por decisão do Jeferson (11/09/2026): nenhuma trava do
--      plano depende deles, e "assistente técnico" não existe como conceito
--      em nenhum outro lugar do sistema hoje.
--
-- Correção registrada sobre `agendamento_deposito_previo_exigido` (ver
-- comentário da coluna): a primeira leitura da resposta da Dra. Fernanda
-- ("depósito prévio varia processo a processo, depende do juízo") tinha sido
-- registrada como confirmação de que o alerta do plano §4.2 podia nascer
-- sozinho a partir de `deposito_situacao` (opção B do plano), sem campo novo.
-- Reler o MODELO ORIGINAL (não só a paráfrase da resposta dela) mostrou que
-- o modelo já previa isso como um campo próprio e explícito — "Confirmação
-- do depósito exigida antes do agendamento? Sim/Não/Não aplicável" —,
-- distinto de "Depósito confirmado?" (esse sim já coberto por
-- `deposito_situacao`). Ou seja, é um fato jurídico do caso (o que o despacho
-- exige), não um estado observável a partir de haver ou não depósito
-- pendente. A resposta dela ("depende do juízo, varia") na verdade sustenta
-- ISSO — um campo pra marcar por processo —, não a inferência automática.
-- Fica registrado: reler a fonte primária pegou um erro que a paráfrase da
-- resposta, sozinha, não pegaria.
--
-- Nenhuma coluna tem default que mude comportamento — tudo nullable, nenhuma
-- linha existente é afetada.
-- ============================================================================

alter table public.processos
  -- 1) Honorários (seção III do Modelo de Manifestação Consolidada)
  add column honorarios_situacao                text
    check (honorarios_situacao in (
      'nao_fixados', 'arbitrados_concordancia', 'arbitrados_insuficiente_majoracao',
      'impugnados', 'justica_gratuita_regime_especifico'
    )),
  add column honorarios_complexidade            text
    check (honorarios_complexidade in ('baixa', 'media', 'alta', 'excepcional')),
  add column honorarios_horas_tecnicas_estimadas numeric(6, 2),
  add column honorarios_valor_hora_tecnica       numeric(14, 2),

  -- 2) Agendamento (seções II, IV e V do Modelo de Comunicação de Agendamento)
  add column agendamento_data                    date,
  add column agendamento_horario                 time,
  add column agendamento_modalidade              text,
  add column agendamento_local                   text,
  add column agendamento_endereco                text,
  add column agendamento_complemento             text,
  add column agendamento_referencia_acesso       text,
  add column agendamento_necessidade_acompanhante text
    check (agendamento_necessidade_acompanhante in ('nao', 'sim', 'conforme_condicao_clinica')),
  add column agendamento_orientacoes_especificas text,
  add column agendamento_deposito_previo_exigido text
    check (agendamento_deposito_previo_exigido in ('sim', 'nao', 'nao_aplicavel'));

comment on column public.processos.honorarios_situacao is
  '"Proposta / Concordância com Honorários Periciais" — vocabulário literal da seção III do Modelo de Manifestação Consolidada. Só entra na Manifestação Consolidada (não tem petição avulsa); montarSecaoHonorarios usa este campo pra escolher qual dos textos alternativos (proposta / concordância / majoração / impugnação / justiça gratuita) sai no documento.';
comment on column public.processos.honorarios_complexidade is
  '"Complexidade" do modelo — baixa/média/alta/excepcional. Informativo, não trava nada.';
comment on column public.processos.honorarios_horas_tecnicas_estimadas is
  '"Horas técnicas estimadas" do modelo — usado junto com honorarios_valor_hora_tecnica pra compor o texto de justificativa do valor proposto.';
comment on column public.processos.honorarios_valor_hora_tecnica is
  '"Valor da hora técnica" do modelo. honorario_apresentado (já existente) continua sendo o valor total proposto — este campo é só o componente "por hora" usado na justificativa.';

comment on column public.processos.agendamento_data is
  'Data do ato pericial (seção II do Modelo de Comunicação de Agendamento).';
comment on column public.processos.agendamento_horario is
  'Horário do ato pericial.';
comment on column public.processos.agendamento_modalidade is
  '"Modalidade" do modelo (ex.: Presencial) — texto livre, o modelo admite "outra admitida" sem fechar a lista.';
comment on column public.processos.agendamento_local is
  'Nome/identificação do local do ato pericial.';
comment on column public.processos.agendamento_endereco is
  'Endereço completo do local do ato pericial.';
comment on column public.processos.agendamento_complemento is
  'Complemento / sala do local do ato pericial.';
comment on column public.processos.agendamento_referencia_acesso is
  'Referência / orientações de acesso ao local (seção II do modelo).';
comment on column public.processos.agendamento_necessidade_acompanhante is
  '"Necessidade de acompanhante" (seção IV do modelo).';
comment on column public.processos.agendamento_orientacoes_especificas is
  'Orientações específicas ao periciado além da lista fixa de documentos (seção IV do modelo) — texto livre, opcional.';
comment on column public.processos.agendamento_deposito_previo_exigido is
  '"Confirmação do depósito exigida antes do agendamento?" (seção V do modelo) — fato do CASO (o que o despacho exige), marcado uma vez pela perita; não é deduzido de deposito_situacao. null = ainda não respondido, e é um terceiro estado deliberadamente distinto de ''nao''/''nao_aplicavel'': enquanto null, a trava do plano §4.2 (verificarAlertaAgendamento) NÃO gera alerta nem bloqueia nada — só ''sim'' com deposito_situacao fora de integral/dispensado/justica_gratuita dispara o alerta. O formulário de Agendamento deve deixar visível que o campo está pendente de resposta quando null, pra não ser confundido com uma resposta silenciosa de "não exige".';
