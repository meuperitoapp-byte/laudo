-- ============================================================================
-- Fluxo Principal do Perito Judicial — fatia 0: schema do trilho financeiro
-- estruturado (depósito) + granularidade da nomeação/aceite.
-- ============================================================================
-- Ver docs/plano-modulo-fluxo-principal.md. Avança só o que NÃO depende das
-- 2 perguntas em aberto pra Dra. Fernanda (depósito prévio varia por vara? /
-- quem trabalha no sistema hoje?) — nenhuma coluna aqui pressupõe a resposta
-- de nenhuma das duas.
--
-- Três blocos independentes, todos em `processos` (mesmo lugar de
-- honorario_apresentado/honorario_arbitrado/justica_gratuita, migration
-- 20260829120000 — são a mesma família de dado, não um assunto à parte que
-- justificasse tabela nova):
--
--   1) NOMEAÇÃO — "I - Identificação da Nomeação" do Modelo de Aceite. Sem
--      isso, a seção I do documento fica sem os dados básicos de quando/por
--      quê a perita foi chamada.
--   2) ACEITE — aceitou_nomeacao (já existe) guarda só o RESULTADO
--      (sim/nao/destituida). Faltavam os 3 critérios que levam a esse
--      resultado — a trava do plano §4.1 (bloquear a geração do Aceite por
--      impedimento/falta de competência) precisa checar os critérios ANTES
--      de decidir, não só ler uma decisão já tomada.
--   3) DEPÓSITO — vocabulário literal do Modelo de Informação de Dados para
--      Depósito dos Honorários. Alimenta o alerta do plano §4.2: o alerta
--      nasce da SITUAÇÃO do depósito registrada aqui, não de um campo à
--      parte pra ela marcar "este processo depende de depósito prévio" —
--      essa distinção era exatamente a 2ª pergunta em aberto.
--
-- Nenhuma coluna tem default que mude comportamento — tudo nullable, nenhuma
-- linha existente é afetada.
-- ============================================================================

alter table public.processos
  -- 1) Nomeação
  add column nomeacao_id                        text,
  add column nomeacao_data                      date,
  add column nomeacao_ciencia_data              date,
  add column nomeacao_prazo_manifestacao        date,

  -- 2) Análise prévia do aceite (seção II do Modelo de Aceite)
  add column aceite_impedimento_suspeicao       boolean,
  add column aceite_competencia_tecnica         boolean,
  add column aceite_necessita_especialista      boolean,

  -- 3) Depósito dos honorários
  add column deposito_situacao                  text
    check (deposito_situacao in (
      'nao_realizado', 'parcial', 'integral', 'dispensado', 'justica_gratuita', 'aguardando_comprovacao'
    )),
  add column deposito_valor                     numeric(14, 2),
  add column deposito_data                      date,
  add column deposito_responsavel_adiantamento  text
    check (deposito_responsavel_adiantamento in ('autor', 'reu', 'ambos', 'outro')),
  add column deposito_comprovante_documento_id  uuid references public.documentos(id) on delete set null,
  add column deposito_forma_disponibilizacao    text
    check (deposito_forma_disponibilizacao in ('dados_bancarios', 'conta_judicial', 'conforme_juizo', 'outro'));

comment on column public.processos.nomeacao_id is
  'ID/protocolo da nomeação nos autos (seção I do Modelo de Aceite do Encargo Pericial). Texto livre — o formato varia por tribunal.';
comment on column public.processos.nomeacao_data is
  'Data da nomeação pelo Juízo.';
comment on column public.processos.nomeacao_ciencia_data is
  'Data em que a perita tomou ciência da nomeação.';
comment on column public.processos.nomeacao_prazo_manifestacao is
  'Prazo para a manifestação de aceite/impossibilidade.';

comment on column public.processos.aceite_impedimento_suspeicao is
  '"Há impedimento ou suspeição?" (seção II do Modelo de Aceite). Null = ainda não avaliado. true BLOQUEIA a geração do Aceite (trava do plano §4.1) — direciona pra impossibilidade/declínio.';
comment on column public.processos.aceite_competencia_tecnica is
  '"Possui competência técnica para o objeto?". Null = ainda não avaliado. false BLOQUEIA a geração do Aceite.';
comment on column public.processos.aceite_necessita_especialista is
  '"Há necessidade de especialista complementar?" — informativo, não bloqueia (o modelo não trata isso como impeditivo).';

comment on column public.processos.deposito_situacao is
  'Situação do depósito dos honorários periciais — vocabulário literal do Modelo de Dados para Depósito. É este campo (não um campo à parte de "depende de depósito prévio") que alimenta o alerta de agendamento do plano §4.2, enquanto a resposta da Dra. Fernanda sobre como isso varia por vara não volta.';
comment on column public.processos.deposito_valor is
  'Valor já efetivamente depositado até o momento — pode ser menor que honorario_arbitrado (depósito parcial).';
comment on column public.processos.deposito_data is
  'Data do depósito (ou da última atualização de situação/comprovação).';
comment on column public.processos.deposito_responsavel_adiantamento is
  '"Responsável pelo adiantamento" do modelo — quem deve depositar.';
comment on column public.processos.deposito_comprovante_documento_id is
  'Documento de comprovação do depósito, quando anexado — reaproveita o pipeline de `documentos` já existente (mesmo bucket/upload), sem caminho paralelo.';
comment on column public.processos.deposito_forma_disponibilizacao is
  '"Forma de disponibilização" do modelo. Trava de exposição: os dados bancários de configuracoes só podem entrar num documento gerado quando este campo for ''dados_bancarios'' — quando for ''conta_judicial'', a seção de depósito nunca inclui dado bancário nenhum, em nenhuma hipótese.';

-- ============================================================================
-- Fatia 0 (complemento) — dados bancários da perita, em `configuracoes`
-- (linha única, já existe — mesma tabela que guarda o rodapé). Pedido do
-- Jeferson: dado sensível fica fora do código-fonte/histórico do Git, atrás
-- do login, coberto pela mesma RLS `authenticated_full_access` de sempre, e
-- editável pela tela de Configurações que já existe. Nenhuma constante no
-- código pra isso.
-- ============================================================================

alter table public.configuracoes
  add column dados_bancarios_titular      text,
  add column dados_bancarios_cpf_cnpj     text,
  add column dados_bancarios_banco        text,
  add column dados_bancarios_codigo_banco text,
  add column dados_bancarios_agencia      text,
  add column dados_bancarios_conta        text,
  add column dados_bancarios_tipo_conta   text,
  add column dados_bancarios_chave_pix    text;

comment on column public.configuracoes.dados_bancarios_titular is
  'Dados bancários da perita pra depósito de honorários periciais (Modelo de Informação de Dados para Depósito, seção II). NUNCA entram num documento gerado sozinhos — a seção de depósito (fluxo-principal/secoes.ts) só os inclui quando o processo tiver deposito_forma_disponibilizacao = ''dados_bancarios'' E a geração passar confirmação explícita; quando a forma for ''conta_judicial'', ficam sempre de fora.';
