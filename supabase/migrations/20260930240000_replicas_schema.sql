-- ============================================================================
-- Orientação Técnico-Pericial para Elaboração da Réplica (24/09/2026) —
-- 2º módulo do lote PERICONS, modelo em
-- "MODELO_ORIENTACAO_TECNICO_PERICIAL_PARA_REPLICA_PERICONS.pdf".
--
-- Regra do modelo: "deve ser gerado prioritariamente a partir da janela
-- ANÁLISE DA CONTESTAÇÃO, e não como editor de texto vazio" — por isso os
-- "Pontos que merecem atenção na réplica" (§4) NÃO têm tabela própria aqui:
-- na hora de compilar o documento, o sistema lê
-- contestacao_argumentos.incluir_na_replica = true direto, sem redigitação.
-- Esta tabela só guarda os campos que não vêm de lá (V1 enxuto).
-- ============================================================================

create table public.replicas (
  id                          uuid primary key default gen_random_uuid(),
  processo_id                 uuid not null references public.processos(id) on delete cascade unique,

  -- §7 e §10 do modelo — texto livre, um item por linha.
  documentos_nao_considerados text,
  pontos_preservados_pericia  text,

  -- §13 do modelo.
  conclusao_tecnica           text,

  local_emissao               text,
  data_emissao                date,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.replicas is
  'Hub da Orientação Técnico-Pericial para Elaboração da Réplica (1 por processo) — os pontos de atenção vêm de contestacao_argumentos.incluir_na_replica, sem redigitação.';

alter table public.replicas enable row level security;
create policy "replicas_full_access" on public.replicas
  for all to authenticated using (true) with check (true);
