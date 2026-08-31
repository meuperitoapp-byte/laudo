-- ============================================================================
-- configuracoes — configuração global da conta (linha única)
-- ============================================================================
-- Guarda os dados de contato que vão na faixa de identidade dos documentos
-- gerados (e-mail, telefone, Instagram), com um conjunto para Perícia Judicial
-- e outro para Assistência Técnica. Campos de AT em branco = usa os da
-- Judicial (resolvido na aplicação — ver src/features/geracao-laudo/contatos.ts).
--
-- Singleton: `id boolean primary key default true` + `check (id)` garante que
-- só existe a linha id = true. A tela de Configurações faz upsert nessa linha.
-- A logomarca e a assinatura da perita NÃO ficam aqui — continuam como
-- registros em `documentos` (tipo 'logomarca' / 'assinatura_perito',
-- processo_id NULL), agora alimentados pela tela de Configurações.
--
-- Espaço natural, no futuro, para o nome/CRM/cidade padrão da perita (hoje
-- fixos em src/features/preenchimento/perito-padrao.ts) — não migrados agora.
-- ============================================================================

create table public.configuracoes (
  id                          boolean primary key default true,
  contato_judicial_email      text,
  contato_judicial_telefone   text,
  contato_judicial_instagram  text,
  contato_at_email            text,
  contato_at_telefone         text,
  contato_at_instagram        text,
  updated_at                  timestamptz not null default now(),
  constraint configuracoes_unica check (id)
);

comment on table public.configuracoes is
  'Config global da conta (linha única, id = true). Contato para a faixa de identidade dos documentos gerados.';

create trigger trg_set_updated_at
  before update on public.configuracoes
  for each row execute function public.set_updated_at();

alter table public.configuracoes enable row level security;

create policy "authenticated_full_access" on public.configuracoes
  for all to authenticated using (true) with check (true);
