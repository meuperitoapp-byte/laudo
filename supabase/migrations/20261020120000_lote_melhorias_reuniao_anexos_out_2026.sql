-- ============================================================================
-- Lote de melhorias de 20/10/2026 (pedidos da Dra. Fernanda, repassados pelo
-- Jeferson).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Histórico das reuniões de Estratégia pericial
-- ----------------------------------------------------------------------------
-- A reunião "atual" continua em processos.estrategia_pericial_reuniao_* (é o
-- que alimenta a Central de Prazos/Agenda). Ao marcar como REALIZADA ou
-- CANCELADA, a linha vai pra esta tabela e as colunas do processo são
-- limpas — a reunião sai de "O que cumprir" e o registro fica no histórico.
create table public.reunioes_estrategia_historico (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos(id) on delete cascade,
  data          date not null,
  hora          time,
  responsavel   text,
  situacao      text not null check (situacao in ('realizada', 'cancelada')),
  registrado_em timestamptz not null default now()
);

create index idx_reunioes_estrategia_historico_processo
  on public.reunioes_estrategia_historico (processo_id, registrado_em desc);

comment on table public.reunioes_estrategia_historico is
  'Reuniões de Estratégia pericial já encerradas (realizada/cancelada). data/hora/responsavel = o que estava marcado no momento do registro.';

alter table public.reunioes_estrategia_historico enable row level security;
create policy "reunioes_estrategia_historico_full_access" on public.reunioes_estrategia_historico
  for all to authenticated using (true) with check (true);


-- ----------------------------------------------------------------------------
-- 2/3) Anexo nas ações do Plano de ação pericial
-- ----------------------------------------------------------------------------
-- Mesmo padrão de documentos.estrategia_documento_prova_id (lote 15/10/2026).
alter table public.documentos
  add column estrategia_plano_acao_id uuid
    references public.estrategia_plano_acao(id) on delete set null;

create index idx_documentos_estrategia_plano_acao
  on public.documentos (estrategia_plano_acao_id)
  where estrategia_plano_acao_id is not null;

comment on column public.documentos.estrategia_plano_acao_id is
  'Vínculo opcional com uma ação de estrategia_plano_acao — o arquivo também aparece na lista geral de Documentos do processo.';


-- ----------------------------------------------------------------------------
-- Sino de notificações
-- ----------------------------------------------------------------------------
insert into public.atualizacoes_sistema (titulo, descricao) values
  ('Reunião de Estratégia: editar, realizada, cancelada',
   'A reunião agora tem os botões Editar data, Realizada e Cancelada — as encerradas ficam no histórico do card.'),
  ('Anexo nas ações do Plano de ação',
   'Cada ação do Plano de ação pericial pode receber arquivos anexos (opcional).');
