-- ============================================================================
-- processo_partes — múltiplas pessoas por polo (Ativo/Passivo)
-- ============================================================================
-- Pedido da Dra. Fernanda: em vez de um campo de texto único por polo
-- (processos.parte_autora / processos.partes_re), poder cadastrar VÁRIAS
-- pessoas em cada polo (ex.: vários autores, vários réus), cada uma com um
-- papel (Autor(a)/Réu, Reclamante/Reclamado, Curatelando(a)/Curatelado(a)
-- etc. — varia por tipo de processo, por isso `papel` é texto livre, não
-- enum). Rótulo "Polo Ativo"/"Polo Passivo" escolhido por ser genérico o
-- bastante pra qualquer tipo de laudo (outro pedido da mesma rodada).
--
-- processos.parte_autora e processos.partes_re NÃO são removidos — ficam
-- como colunas legadas, sem uso a partir de agora (o formulário de cadastro
-- não escreve mais nelas), pra não quebrar nada que ainda as leia e evitar
-- descartar dado histórico. O cabeçalho formal do laudo (cabecalho.ts) passa
-- a montar Parte autora/Parte ré a partir de processo_partes; se um processo
-- antigo não tiver nenhuma linha em processo_partes, cai de volta pras
-- colunas antigas (ver próximo commit de código).
create table public.processo_partes (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos(id) on delete cascade,
  polo          text not null check (polo in ('ativo', 'passivo')),
  papel         text not null,   -- ex.: "Autor(a)", "Réu", "Reclamante", "Curatelando(a)" — varia por tipo de processo
  nome          text not null,
  ordem         integer not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.processo_partes is
  'Pessoas de cada polo (ativo/passivo) de um processo — substitui processos.parte_autora/partes_re (mantidas só por compatibilidade histórica).';
comment on column public.processo_partes.papel is
  'Papel processual da pessoa (Autor(a), Réu, Reclamante, Curatelando(a) etc.) — texto livre porque o vocabulário varia por tipo de processo.';

create index idx_processo_partes_processo on public.processo_partes (processo_id);

create trigger trg_set_updated_at
  before update on public.processo_partes
  for each row execute function public.set_updated_at();

alter table public.processo_partes enable row level security;

create policy "authenticated_full_access" on public.processo_partes
  for all to authenticated using (true) with check (true);

-- Backfill best-effort dos processos já cadastrados: uma pessoa por polo, a
-- partir do texto livre que já existia. Papel genérico ("Autor(a)"/"Réu(é)")
-- porque não dá pra inferir com segurança o papel correto (Reclamante,
-- Curatelando etc.) só a partir do tipo_laudo aqui — a perita ajusta o papel
-- na tela se quiser algo mais específico.
insert into public.processo_partes (processo_id, polo, papel, nome, ordem)
select id, 'ativo', 'Autor(a)', parte_autora, 1
from public.processos
where parte_autora is not null and trim(parte_autora) <> '';

insert into public.processo_partes (processo_id, polo, papel, nome, ordem)
select id, 'passivo', 'Réu(é)', partes_re, 1
from public.processos
where partes_re is not null and trim(partes_re) <> '';
