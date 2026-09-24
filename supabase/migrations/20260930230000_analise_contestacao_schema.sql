-- ============================================================================
-- Análise da Contestação (24/09/2026) — modelo enviado pela Dra. Fernanda em
-- "PERICONS_ANALISE_DA_CONTESTACAO_MODELO_ENXUTO.pdf". Primeiro de 5 módulos
-- do lote (Contestação -> Réplica -> Quesitos -> Relatório Técnico ->
-- Estratégia Pericial), V1 enxuto confirmado com o Jeferson: sem geração
-- automática de tarefa, sem versionamento por adendo — fica pra 2ª rodada.
--
-- Regra do modelo (§5 "REGRAS PARA O PROGRAMADOR"): é uma TELA de raciocínio
-- e decisão, não um documento — por isso não tem par em laudos_gerados. A
-- Orientação para Réplica (próxima migração) é o produto externo, e lê os
-- argumentos marcados aqui como `incluir_na_replica`.
--
-- Também estende laudos_gerados.tipo já de uma vez com os 4 tipos dos
-- próximos módulos do lote (orientacao_replica, quesitos_parte,
-- relatorio_tecnico, estrategia_pericial), pra não editar essa constraint 4x.
-- ============================================================================

create table public.analises_contestacao (
  id                       uuid primary key default gen_random_uuid(),
  processo_id              uuid not null references public.processos(id) on delete cascade unique,

  -- §3 do modelo — próxima ação obrigatória.
  proxima_acao             text check (proxima_acao in (
                             'gerar_orientacao_replica', 'elaborar_quesitos', 'solicitar_documentos',
                             'atualizar_estrategia', 'preparar_parecer_tecnico', 'aguardar_manifestacao', 'outro'
                           )),
  proxima_acao_outra       text,
  responsavel              text,
  prazo                    date,
  prioridade               text not null default 'normal' check (prioridade in ('normal', 'alta', 'urgente')),
  concluida                boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.analises_contestacao is
  'Hub da Análise da Contestação (1 por processo) — tela de raciocínio/decisão, não documento. Modelo: PERICONS_ANALISE_DA_CONTESTACAO_MODELO_ENXUTO.pdf.';

alter table public.analises_contestacao enable row level security;
create policy "analises_contestacao_full_access" on public.analises_contestacao
  for all to authenticated using (true) with check (true);

-- §1 do modelo — matriz de confronto, uma linha por argumento da contestação.
create table public.contestacao_argumentos (
  id                       uuid primary key default gen_random_uuid(),
  analise_id               uuid not null references public.analises_contestacao(id) on delete cascade,
  ordem                    integer not null default 0,

  argumento                text not null,
  analise_tecnica          text,
  evidencia_documento      text,
  repercussao              text check (repercussao in (
                             'nao_interfere', 'exige_esclarecimento', 'fragiliza_parcialmente',
                             'fragiliza_significativamente', 'pode_ser_enfrentado_tecnicamente',
                             'exige_prova_complementar', 'deve_ser_esclarecido_pela_pericia'
                           )),
  orientacao               text,

  -- §2 do modelo — múltipla seleção, "um mesmo argumento pode gerar múltiplos desdobramentos".
  decisoes                 text[] not null default '{}',
  decisao_outra            text,
  incluir_na_replica       boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.contestacao_argumentos is
  'Matriz de confronto da Análise da Contestação — 1 linha por argumento. incluir_na_replica alimenta a Orientação para Réplica sem redigitação.';

alter table public.contestacao_argumentos enable row level security;
create policy "contestacao_argumentos_full_access" on public.contestacao_argumentos
  for all to authenticated using (true) with check (true);

create index contestacao_argumentos_analise_id_idx on public.contestacao_argumentos(analise_id, ordem);

-- Novo tipo em laudos_gerados.tipo — já cobrindo os 4 próximos módulos do lote.
alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia',
    'manifestacao_inicial', 'impossibilidade_assumir', 'escusa_declinio_pericial',
    'nao_comparecimento', 'pedido_liberacao',
    'analise_viabilidade',
    'atestado', 'declaracao',
    'orientacao_replica', 'quesitos_parte', 'relatorio_tecnico', 'estrategia_pericial'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial | nao_comparecimento | pedido_liberacao | analise_viabilidade | atestado | declaracao | orientacao_replica | quesitos_parte | relatorio_tecnico | estrategia_pericial. Discrimina a forma de snapshot_respostas.';
