-- ============================================================================
-- PERICONS — 2ª rodada de automações (25/09/2026), sobre o lote de 5 módulos
-- de 24/09/2026. Itens concretos e de baixo risco, seguindo padrões já
-- estabelecidos no projeto:
--
-- 1) `resolvido_em` em contestacao_argumentos e estrategia_documentos_provas
--    — mesmo princípio de caso_documentos_faltantes/caso_oportunidades_
--    probatorias (Análise de Viabilidade): alimenta novas fontes da Central
--    de Prazos, nunca grava em central_tarefas (que é só cadastro manual
--    dela).
-- 2) estrategia_plano_acao (§13 do modelo) e estrategia_responsabilidades
--    (§8 do modelo) — tabelas repetíveis que faltavam no V1 enxuto.
--
-- NÃO incluído nesta rodada (decisão consciente, não esquecimento):
-- versionamento por adendo (histórico completo de alterações). O próprio
-- projeto já tomou essa decisão pra Análise de Viabilidade (ver comentário
-- no topo de 20260926120000_analise_viabilidade_schema.sql: "não resolver
-- histórico completo agora — só deixar a porta aberta") — construir um
-- sistema de versionamento de verdade pros 5 módulos novos sem um pedido
-- concreto de como ela quer ver esse histórico seria especular. Fica pra
-- quando ela testar o V1 e pedir algo específico.
-- ============================================================================

alter table public.contestacao_argumentos
  add column resolvido_em timestamptz;

comment on column public.contestacao_argumentos.resolvido_em is
  'Quando a providência deste argumento (ex.: decisão "solicitar documento complementar") foi concluída. Alimenta a Central de Prazos direto — nunca grava em central_tarefas.';

alter table public.estrategia_documentos_provas
  add column resolvido_em timestamptz;

comment on column public.estrategia_documentos_provas.resolvido_em is
  'Quando o documento/prova foi obtido. Alimenta a Central de Prazos direto — nunca grava em central_tarefas.';

-- §13 do modelo — plano de ação pericial.
create table public.estrategia_plano_acao (
  id              uuid primary key default gen_random_uuid(),
  estrategia_id   uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem           integer not null default 0,
  acao            text not null,
  objetivo        text,
  responsavel     text,
  prazo           date,
  status          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.estrategia_plano_acao enable row level security;
create policy "estrategia_plano_acao_full_access" on public.estrategia_plano_acao
  for all to authenticated using (true) with check (true);
create index estrategia_plano_acao_estrategia_id_idx on public.estrategia_plano_acao(estrategia_id, ordem);

-- §8 do modelo — responsabilidades/condutas diferenciadas por agente (só quando há múltiplos profissionais/instituições).
create table public.estrategia_responsabilidades (
  id                    uuid primary key default gen_random_uuid(),
  estrategia_id         uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem                 integer not null default 0,
  agente                text not null,
  objeto_investigacao   text,
  conduta_documentada   text,
  ponto_controvertido   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.estrategia_responsabilidades enable row level security;
create policy "estrategia_responsabilidades_full_access" on public.estrategia_responsabilidades
  for all to authenticated using (true) with check (true);
create index estrategia_responsabilidades_estrategia_id_idx on public.estrategia_responsabilidades(estrategia_id, ordem);
