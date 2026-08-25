-- ============================================================================
-- respostas_secao — texto narrativo COMPOSTO por seção (Etapa 4 — motor de
-- preenchimento por seção)
-- ============================================================================
-- Lacuna identificada ao implementar o preenchimento: `respostas_processo`
-- guarda texto_narrativo por CAMPO (campo_id not null), mas boa parte das
-- seções (ex.: Curatela IX "Exame Clínico Geral", X "Exame do Estado Mental")
-- gera seu texto a partir de `secoes.texto_automatico_template` — um único
-- parágrafo que combina VÁRIOS campos da seção, não o texto de um campo
-- isolado. Não havia onde persistir esse parágrafo composto, nem a edição
-- manual da perita sobre ele (regra: texto automático sempre editável e a
-- edição manual deve ser preservada).
--
-- Decisão tomada com a Dra./responsável técnico antes desta migration: tabela
-- nova, no mesmo padrão de `respostas_processo`, só que em granularidade de
-- seção. `editado_manualmente` sinaliza que o texto não deve mais ser
-- recomposto automaticamente ao mudar uma marcação — só quando a perita pedir
-- explicitamente ("Regenerar automaticamente" na UI).
-- ============================================================================

create table public.respostas_secao (
  id                    uuid primary key default gen_random_uuid(),
  processo_id           uuid not null references public.processos(id) on delete cascade,
  secao_id              uuid not null references public.secoes(id) on delete restrict,
  texto_narrativo       text,
  editado_manualmente   boolean not null default false,
  respondido_por        uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (processo_id, secao_id)
);

comment on table public.respostas_secao is
  'Texto narrativo composto por seção (gerado a partir de secoes.texto_automatico_template combinando vários campos, ou escrito manualmente em seções estruturais sem campos_secao). editado_manualmente = true trava a recomposição automática até a perita pedir para regenerar.';

create index idx_respostas_secao_processo on public.respostas_secao (processo_id);
create index idx_respostas_secao_secao on public.respostas_secao (secao_id);

create trigger trg_set_updated_at
  before update on public.respostas_secao
  for each row execute function public.set_updated_at();

alter table public.respostas_secao enable row level security;

create policy "authenticated_full_access" on public.respostas_secao
  for all to authenticated using (true) with check (true);
