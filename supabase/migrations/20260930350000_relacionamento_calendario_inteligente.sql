-- ============================================================================
-- Módulo de Relacionamento (CRM) — Fase 2: Calendário Inteligente de
-- Relacionamento. Modelo: "PERICONS_MODULO_RELACIONAMENTO_DEFINITIVO_PARA_
-- PROGRAMADOR.pdf", §22-23. Terceira camada de gatilhos (institucional já
-- entregue na Fase 1, continuidade de serviços idem) — datas pessoais,
-- profissionais e campanhas temáticas de saúde.
--
-- Regra mantida: nada fixo no código que a gestão deva poder editar (§22.8)
-- — datas comemorativas por profissão e campanhas temáticas de saúde viram
-- tabelas configuráveis, não catálogos hardcoded.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Campos pessoais/institucionais adicionais em `relacionamentos`.
-- `data_nascimento` cobre Cliente Saúde e Profissional (pessoa física) e um
-- Advogado/Escritório sem advogados vinculados cadastrados (solo) — quando
-- há vinculados, o aniversário de cada um já vem de
-- `relacionamento_advogados.data_nascimento` (Fase 1).
-- ----------------------------------------------------------------------------
alter table public.relacionamentos add column data_nascimento date;

-- §22.3 — Cliente Saúde: condição e dinâmica do acompanhamento. Só tipo =
-- cliente_saude. `cs_situacao_atual` inclui 'falecido', que bloqueia
-- automaticamente (na aplicação, não aqui) qualquer campanha/aniversário
-- pessoal dirigido à pessoa.
alter table public.relacionamentos add column cs_condicao_principal text;
alter table public.relacionamentos add column cs_area_clinica text;
alter table public.relacionamentos add column cs_situacao_atual text check (cs_situacao_atual in (
  'em_tratamento', 'em_acompanhamento', 'tratamento_concluido', 'condicao_controlada',
  'situacao_desconhecida', 'falecido'
));
alter table public.relacionamentos add column cs_situacao_atualizada_em date;
alter table public.relacionamentos add column cs_data_falecimento date;
alter table public.relacionamentos add column cs_data_conhecimento date;
-- §22.4 — "não transformar automaticamente o familiar em novo cliente; exigir
-- cadastro e vínculo próprios": o familiar É um `relacionamentos` à parte
-- (tipicamente tipo=cliente_saude também), vinculado aqui explicitamente.
alter table public.relacionamentos add column cs_familiar_responsavel_id uuid references public.relacionamentos(id) on delete set null;

comment on column public.relacionamentos.cs_situacao_atual is
  'Quando = falecido, a aplicação exclui automaticamente o cadastro das listas de aniversário/campanha pessoal (§22.4) — preserva histórico, nunca exclui o registro.';

-- ----------------------------------------------------------------------------
-- 2) Resultado do contato/campanha (§22.6: "Enviado / respondido / contato
-- realizado / não realizado") — extensão nullable de uma tabela já existente
-- da Fase 1, não tabela nova. Serve tanto campanha institucional quanto
-- temática de saúde (mesmo campo `campanha` já registra qual).
-- ----------------------------------------------------------------------------
alter table public.relacionamento_interacoes add column resultado text check (resultado in (
  'enviado', 'respondido', 'contato_realizado', 'nao_realizado'
));

-- ----------------------------------------------------------------------------
-- 3) Datas comemorativas por profissão — configurável pela gestão (§22.1:
-- "cadastráveis e editáveis pela gestão, sem alteração do código").
-- `profissao` é texto livre (bate com prof_profissao/prof_profissao_outra ou
-- "Advogado" pro tipo advogado_escritorio) — não FK pra enum, porque
-- prof_profissao_outra já é texto livre e "Advogado" nem é um valor desse
-- enum (é o tipo do relacionamento, não uma profissão da lista).
-- `data_comemorativa` guarda só dia/mês ('MM-DD'), igual todo ano.
-- ----------------------------------------------------------------------------
create table public.datas_comemorativas_profissionais (
  id                  uuid primary key default gen_random_uuid(),
  profissao           text not null unique,
  data_comemorativa   text not null check (data_comemorativa ~ '^\d{2}-\d{2}$'),
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.datas_comemorativas_profissionais enable row level security;
create policy "datas_comemorativas_profissionais_full_access" on public.datas_comemorativas_profissionais
  for all to authenticated using (true) with check (true);

-- Semente com as datas comemorativas brasileiras mais comuns — editável /
-- expansível pela tela de configurações, sem depender de nova migration.
insert into public.datas_comemorativas_profissionais (profissao, data_comemorativa) values
  ('Advogado', '08-11'),
  ('Médico', '10-18'),
  ('Dentista', '10-25'),
  ('Psicólogo', '08-27');

-- ----------------------------------------------------------------------------
-- 4) Campanhas temáticas de saúde — configurável pela gestão (§22.6).
-- `situacoes_permitidas` vazio = todas exceto as excluídas.
-- ----------------------------------------------------------------------------
create table public.campanhas_tematicas_saude (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  area_clinica           text,
  situacoes_permitidas   text[] not null default '{}',
  situacoes_excluidas    text[] not null default '{falecido}',
  canal                  text check (canal in ('whatsapp', 'telefone', 'email', 'reuniao', 'presencial', 'outro')),
  mensagem_modelo        text,
  ativo                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.campanhas_tematicas_saude enable row level security;
create policy "campanhas_tematicas_saude_full_access" on public.campanhas_tematicas_saude
  for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 5) Configurações do Calendário Inteligente — mesma linha única da Fase 1
-- (`relacionamento_configuracoes`), não tabela nova.
-- ----------------------------------------------------------------------------
alter table public.relacionamento_configuracoes add column prazo_meses_atualizacao_cliente_saude integer not null default 6;
alter table public.relacionamento_configuracoes add column dias_antecedencia_aniversarios integer not null default 15;

comment on column public.relacionamento_configuracoes.prazo_meses_atualizacao_cliente_saude is
  '§22.5 — gera alerta na Central de Prazos quando cs_situacao_atualizada_em está mais velho que isso (e a situação não é falecido).';
comment on column public.relacionamento_configuracoes.dias_antecedencia_aniversarios is
  '§22.1/22.7 — janela de antecedência pro painel "Próximas oportunidades de relacionamento" (aniversários pessoais, profissionais e de parceria).';
