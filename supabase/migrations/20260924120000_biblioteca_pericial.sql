-- ============================================================================
-- biblioteca_pericial — acervo de referência técnica por área pericial
-- ============================================================================
-- Pedido já combinado desde 19/09/2026 (nome no menu como placeholder).
-- Cadastro manual por enquanto — a ideia de vir automática (buscar
-- CONITEC/NATJUS/jurisprudência sozinho) fica pra depois, não é V1.

create table public.biblioteca_pericial (
  id            uuid primary key default gen_random_uuid(),
  -- Lista fechada (vocabulário fixo, definido junto com a Dra. Fernanda) — diferente de
  -- area_pericial, que é catálogo editável (ver comentário abaixo).
  categoria     text not null
                  check (categoria in (
                    'quesitos_por_area',
                    'teses',
                    'literatura',
                    'legislacao_normas',
                    'conitec_natjus_pcdt',
                    'protocolos_diretrizes',
                    'jurisprudencia_tecnica'
                  )),
  area_pericial text,      -- catálogo editável (ex.: "violência obstétrica", "acidente de trabalho") — mesmo padrão de processos.orgao_classe: texto livre, sem CHECK, cresce sozinho
  titulo        text not null,
  conteudo      text not null,
  fonte         text,      -- referência opcional (norma, acórdão, DOI, link) — não confundir com `conteudo`
  criado_por    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.biblioteca_pericial is
  'Acervo de referência técnica por área pericial: quesitos já formulados, teses, literatura, legislação/normas, CONITEC/NATJUS/PCDT, protocolos/diretrizes e jurisprudência técnica. Cadastro manual — geração automática fica pra depois.';

comment on column public.biblioteca_pericial.area_pericial is
  'Catálogo editável (ex.: violência obstétrica, acidente de trabalho) — mesmo padrão de processos.orgao_classe: texto livre sem CHECK, cresce pelos valores já usados.';

create index idx_biblioteca_pericial_categoria on public.biblioteca_pericial (categoria);
create index idx_biblioteca_pericial_area on public.biblioteca_pericial (area_pericial);

create trigger trg_set_updated_at
  before update on public.biblioteca_pericial
  for each row execute function public.set_updated_at();

alter table public.biblioteca_pericial enable row level security;

create policy "biblioteca_pericial_full_access" on public.biblioteca_pericial
  for all to authenticated using (true) with check (true);
