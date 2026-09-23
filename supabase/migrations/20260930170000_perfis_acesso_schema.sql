-- ============================================================================
-- Perfis de acesso — Etapa 1 (30/09/2026, pedido da Dra. Fernanda: ela quer
-- gerenciar sozinha quem vê o quê no sistema, em vez de um esquema fixo
-- decidido pelo Jeferson/Claude). Reabre a decisão anterior de não construir
-- papéis/RLS (ver memória "fluxo-principal-perito-judicial") — agora é pedido
-- explícito dela.
--
-- Autoadministrável: ela cria/edita/apaga perfis (nome livre), marca quais
-- módulos cada perfil enxerga, e vincula um e-mail a um perfil. A Dra.
-- Fernanda em si NUNCA passa por essa tabela — email sem linha em
-- `perfil_usuarios` = acesso total (regra "grandfather": ninguém que já tem
-- login hoje (ela e a secretária) fica mais restrito no dia em que isto for
-- ligado — só quem ela EXPLICITAMENTE atribuir a um perfil passa a ser
-- filtrado).
--
-- `modulo` é uma lista fixa (os 9 itens do menu principal, ver
-- src/components/ui/top-nav.tsx) — não é algo que ela "inventa" no painel,
-- é o catálogo de telas que o código realmente sabe proteger. Granularidade
-- por módulo inteiro (ex.: "processos" cobre viabilidade/pós-laudo/fluxo
-- principal/documentos/laudo/quesitos de qualquer caso) — suficiente pro
-- tamanho da equipe (4 pessoas), sem over-engineering.
--
-- RLS: mesmo padrão de TODA tabela do projeto desde 20260823100000 —
-- habilitada, com uma única política "authenticated_full_access" (qualquer
-- usuário logado tem acesso total; `anon` não tem nenhum). O controle de
-- QUEM vê QUAL MÓDULO da aplicação é feito na camada do Next.js (layout/
-- middleware), não no Postgres — o RLS aqui só impede acesso direto via API
-- sem sessão, igual em qualquer outra tabela.
-- ============================================================================

create table public.perfis (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perfis is
  'Perfis de acesso autoadministráveis pela Dra. Fernanda (ex.: Secretária, CEO, Financeiro) — nome livre, ela cria/edita/apaga.';

create table public.perfil_permissoes (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.perfis(id) on delete cascade,
  modulo     text not null check (modulo in (
               'dashboard', 'processos', 'hoje', 'agenda', 'financeiro',
               'relacionamento', 'biblioteca_pericial', 'respostas_reutilizaveis',
               'configuracoes'
             )),
  created_at timestamptz not null default now(),
  unique (perfil_id, modulo)
);

comment on table public.perfil_permissoes is
  'Quais módulos (itens do menu principal) cada perfil pode ver — a ausência de uma linha significa "sem acesso" a esse módulo.';

create table public.perfil_usuarios (
  id             uuid primary key default gen_random_uuid(),
  perfil_id      uuid not null references public.perfis(id) on delete restrict,
  email          text not null unique,
  nome_exibicao  text not null,
  created_at     timestamptz not null default now()
);

comment on table public.perfil_usuarios is
  'Vincula um e-mail (login) a um perfil de acesso. E-mail sem linha aqui = acesso total (grandfather rule) — a Dra. Fernanda nunca precisa de linha própria. `on delete restrict` no perfil: apagar um perfil com gente vinculada é bloqueado até ela reatribuir essas pessoas, pra nunca conceder acesso total sem querer.';
comment on column public.perfil_usuarios.nome_exibicao is
  'Nome usado como "responsável" na Central de Prazos/Agenda (ex.: "Secretária", "CEO") — alimenta o filtro por pessoa já existente.';

alter table public.perfis            enable row level security;
alter table public.perfil_permissoes enable row level security;
alter table public.perfil_usuarios   enable row level security;

create policy "perfis_full_access" on public.perfis
  for all to authenticated using (true) with check (true);

create policy "perfil_permissoes_full_access" on public.perfil_permissoes
  for all to authenticated using (true) with check (true);

create policy "perfil_usuarios_full_access" on public.perfil_usuarios
  for all to authenticated using (true) with check (true);
