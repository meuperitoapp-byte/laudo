-- ============================================================================
-- Chat interno da equipe (24/09/2026, pedido da Dra. Fernanda) — sala única,
-- geral, todo mundo que tem login vê e escreve. Tempo real de verdade via
-- Supabase Realtime (primeira vez que o sistema usa esse recurso) — por isso
-- a tabela entra explicitamente na publicação `supabase_realtime`, sem o que
-- as mensagens só apareceriam ao recarregar a página.
-- ============================================================================

create table public.chat_mensagens (
  id          uuid primary key default gen_random_uuid(),
  autor_email text not null,
  autor_nome  text not null,
  texto       text not null,
  created_at  timestamptz not null default now()
);

comment on table public.chat_mensagens is
  'Chat interno da equipe — sala única, sem canais nem DM. autor_nome é o nome_exibicao (perfil restrito) ou o prefixo do e-mail (admin), calculado na aplicação, nunca aqui.';

create index idx_chat_mensagens_created_at on public.chat_mensagens (created_at);

alter table public.chat_mensagens enable row level security;

create policy "chat_mensagens_full_access" on public.chat_mensagens
  for all to authenticated using (true) with check (true);

-- Habilita o Realtime pra esta tabela — sem isso, INSERTs não disparam
-- evento nenhum pros clientes inscritos (supabase.channel(...).on(...)).
alter publication supabase_realtime add table public.chat_mensagens;

-- Novo módulo "chat" no catálogo fixo de perfil_permissoes.modulo (ver
-- migration 20260930170000) — precisa recriar o CHECK com a lista completa
-- (mesmo padrão de laudos_gerados_tipo_check etc.).
alter table public.perfil_permissoes drop constraint perfil_permissoes_modulo_check;
alter table public.perfil_permissoes add constraint perfil_permissoes_modulo_check check (modulo in (
  'dashboard', 'processos', 'hoje', 'agenda', 'financeiro',
  'relacionamento', 'biblioteca_pericial', 'respostas_reutilizaveis',
  'configuracoes', 'chat'
));
