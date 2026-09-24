-- ============================================================================
-- Estratégia Pericial (24/09/2026) — 5º e último módulo do lote PERICONS,
-- modelo em "PERICONS_MODELO_PADRAO_ESTRATEGIA_PERICIAL_PARA_PROGRAMADOR.pdf"
-- (17 seções no modelo completo). V1 enxuto confirmado com o Jeferson:
-- estrutura + geração de PDF/Word funcionando; ficam para uma 2ª rodada
-- (não estão nesta migration): linha do tempo/marcos probatórios (§5,
-- depende de módulo de linha do tempo que ainda não existe pra AT),
-- responsabilidades diferenciadas por agente (§8, nicho multi-agente),
-- plano de ação tabular (§13, redundante com a próxima ação no V1),
-- geração automática de tarefa (§9/"gerar ponto para quesito" etc.) e
-- versionamento por adendo (§10 do modelo da Réplica, mesma lógica).
--
-- Regra do modelo mantida mesmo no V1 enxuto: "não é um editor de texto em
-- branco" — por isso eixos/pontos/fragilidades/teses adversas/documentos são
-- tabelas repetíveis estruturadas, não um textarea.
--
-- Rodapé OBRIGATÓRIO no documento final (pedido explícito da Dra. Fernanda,
-- 24/09/2026): "Esse material é estudo direcionado à equipe jurídica e não
-- representa parecer técnico médico-legal." — fixo no compilador, não é
-- campo editável (ver features/estrategia-pericial/compilar-pdf.ts).
-- ============================================================================

create table public.estrategias_periciais (
  id                          uuid primary key default gen_random_uuid(),
  processo_id                 uuid not null references public.processos(id) on delete cascade unique,

  -- §2/§3 do modelo.
  resumo_tecnico_caso         text,
  questao_central             text,
  questoes_secundarias        text[] not null default '{}',

  -- §4 do modelo (eixos em tabela própria, ver abaixo).
  tese_principal              text,

  -- §6 do modelo — cadeia probatória (sequência fixa de 6 elos).
  cadeia_estado_anterior      text,
  cadeia_evento               text,
  cadeia_alteracao            text,
  cadeia_persistencia         text,
  cadeia_exame_diagnostico    text,
  cadeia_dano_repercussao     text,

  -- §12 do modelo — pontos essenciais a serem levados à perícia (lista simples).
  pontos_pericia              text[] not null default '{}',

  -- §14 do modelo.
  conclusao_direcao_estrategica text,

  -- §15 do modelo — próxima ação obrigatória (mesmo padrão de analises_contestacao).
  proxima_acao                text check (proxima_acao in (
                                'elaborar_quesitos', 'solicitar_documentos', 'preparar_pericia',
                                'gerar_orientacao_replica', 'elaborar_parecer_relatorio',
                                'atualizar_estrategia', 'aguardar_andamento', 'outro'
                              )),
  proxima_acao_outra          text,
  responsavel                 text,
  prazo                       date,
  prioridade                  text not null default 'normal' check (prioridade in ('normal', 'alta', 'urgente')),

  local_emissao               text,
  data_emissao                date,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.estrategias_periciais is
  'Hub da Estratégia Pericial (1 por processo, V1 enxuto) — modelo: PERICONS_MODELO_PADRAO_ESTRATEGIA_PERICIAL_PARA_PROGRAMADOR.pdf.';

alter table public.estrategias_periciais enable row level security;
create policy "estrategias_periciais_full_access" on public.estrategias_periciais
  for all to authenticated using (true) with check (true);

-- §4 — "permitir mais de um eixo independente e complementar".
create table public.estrategia_eixos_tese (
  id                uuid primary key default gen_random_uuid(),
  estrategia_id     uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem             integer not null default 0,
  titulo            text not null,
  tese_especifica   text,
  base_atual        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.estrategia_eixos_tese enable row level security;
create policy "estrategia_eixos_tese_full_access" on public.estrategia_eixos_tese
  for all to authenticated using (true) with check (true);
create index estrategia_eixos_tese_estrategia_id_idx on public.estrategia_eixos_tese(estrategia_id, ordem);

-- §7 — pontos técnicos de investigação.
create table public.estrategia_pontos_investigacao (
  id                uuid primary key default gen_random_uuid(),
  estrategia_id     uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem             integer not null default 0,
  ponto             text not null,
  o_que_sabemos     text,
  o_que_demonstrar  text,
  como_provar       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.estrategia_pontos_investigacao enable row level security;
create policy "estrategia_pontos_investigacao_full_access" on public.estrategia_pontos_investigacao
  for all to authenticated using (true) with check (true);
create index estrategia_pontos_investigacao_estrategia_id_idx on public.estrategia_pontos_investigacao(estrategia_id, ordem);

-- §9 — "pergunta obrigatória: o que pode enfraquecer ou limitar a tese assistida?"
create table public.estrategia_fragilidades (
  id                uuid primary key default gen_random_uuid(),
  estrategia_id     uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem             integer not null default 0,
  fragilidade       text not null,
  classificacao     text check (classificacao in ('controlavel', 'depende_documento', 'depende_pericia', 'nao_controlavel')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.estrategia_fragilidades enable row level security;
create policy "estrategia_fragilidades_full_access" on public.estrategia_fragilidades
  for all to authenticated using (true) with check (true);
create index estrategia_fragilidades_estrategia_id_idx on public.estrategia_fragilidades(estrategia_id, ordem);

-- §10 — teses adversas previsíveis e resposta técnica.
create table public.estrategia_teses_adversas (
  id                    uuid primary key default gen_random_uuid(),
  estrategia_id         uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem                 integer not null default 0,
  tese_adversa          text not null,
  resposta_tecnica      text,
  evidencia_necessaria  text,
  destino               text check (destino in ('replica', 'quesito', 'pericia')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.estrategia_teses_adversas enable row level security;
create policy "estrategia_teses_adversas_full_access" on public.estrategia_teses_adversas
  for all to authenticated using (true) with check (true);
create index estrategia_teses_adversas_estrategia_id_idx on public.estrategia_teses_adversas(estrategia_id, ordem);

-- §11 — documentos e provas complementares.
create table public.estrategia_documentos_provas (
  id                uuid primary key default gen_random_uuid(),
  estrategia_id     uuid not null references public.estrategias_periciais(id) on delete cascade,
  ordem             integer not null default 0,
  documento         text not null,
  motivo            text,
  prioridade        text check (prioridade in ('essencial', 'importante', 'complementar')),
  acao              text check (acao in ('solicitar', 'obter')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.estrategia_documentos_provas enable row level security;
create policy "estrategia_documentos_provas_full_access" on public.estrategia_documentos_provas
  for all to authenticated using (true) with check (true);
create index estrategia_documentos_provas_estrategia_id_idx on public.estrategia_documentos_provas(estrategia_id, ordem);
