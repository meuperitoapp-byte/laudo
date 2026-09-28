-- ============================================================================
-- Módulo de Relacionamento (CRM) — Fase 3 (última): Desfecho Judicial e
-- Biblioteca de Decisões PERICONS. Modelo:
-- "PERICONS_MODULO_RELACIONAMENTO_DEFINITIVO_PARA_PROGRAMADOR.pdf", §24-25.
--
-- Conceitualmente separado da "Biblioteca Pericial" já existente
-- (`biblioteca_pericial` — acervo de referência técnica: quesitos, teses,
-- literatura, jurisprudência técnica). A Biblioteca de Decisões é o acervo
-- interno dos DESFECHOS dos próprios casos PERICONS, sempre rastreável até o
-- processo de origem — por isso fica como sub-rota de /biblioteca-pericial
-- (mesmo módulo de acesso), não um item de menu novo.
--
-- Regra central do §24: um processo pode ter MÚLTIPLOS registros de decisão
-- em ordem cronológica (tutela -> sentença -> recurso -> acórdão -> trânsito
-- em julgado) — a mais recente NUNCA apaga as anteriores. `desfecho_atual` e
-- `desfecho_definitivo` são flags manuais (só um true por processo em cada
-- uma, garantido na aplicação, não no banco) que dizem qual registro
-- representa o estado atual e qual é o definitivo.
-- ============================================================================

create table public.desfechos_judiciais (
  id                          uuid primary key default gen_random_uuid(),
  processo_id                 uuid not null references public.processos(id) on delete cascade,

  area                        text not null check (area in ('saude', 'medico', 'trabalhista', 'previdenciario', 'criminal', 'outra')),
  -- Catálogo editável (texto livre + sugestões) — o modelo já lista a
  -- demanda como algo aberto ("medicamento, cirurgia, home care, erro
  -- médico, incapacidade, obstetrícia, óbito etc."), mesmo padrão de
  -- situacao_processo/categoria em outros módulos.
  subarea_demanda             text,
  parte_assistida             text check (parte_assistida in ('autor', 'reu', 'reclamante', 'reclamada', 'outra')),
  tipo_decisao                text check (tipo_decisao in ('tutela', 'liminar', 'sentenca', 'acordao', 'decisao_interlocutoria', 'outra')),
  data_decisao                date not null,
  resultado_parte_assistida   text check (resultado_parte_assistida in ('favoravel', 'parcialmente_favoravel', 'desfavoravel', 'sem_julgamento_merito', 'outro')),
  status_decisao              text check (status_decisao in ('provisoria', 'recurso_pendente', 'definitiva', 'transito_julgado', 'outro')),
  -- Rótulos livres (não FK pro enum EtapaContratada — o modelo usa nomes
  -- ligeiramente diferentes, ex. "Acompanhamento", "Análise de laudo").
  servicos_pericons_no_caso   text[] not null default '{}',
  houve_prova_pericial        boolean,
  resultado_pericia           text check (resultado_pericia in ('favoravel', 'parcialmente_favoravel', 'desfavoravel', 'inconclusivo', 'nao_se_aplica')),
  observacao_tecnica          text,

  -- Anexo da decisão — reaproveita a tabela `documentos` já existente (o
  -- upload continua sendo feito na tela de Documentos do processo, aqui só
  -- se SELECIONA qual documento já anexado é a decisão) — evita duplicar
  -- bucket/RLS/lógica de upload de arquivo.
  decisao_documento_id        uuid references public.documentos(id) on delete set null,

  -- §24.3 — campos que só existem pra alimentar filtro da Biblioteca de
  -- Decisões (não estão na tabela de campos do §24.1, mas aparecem no filtro
  -- "Tribunal / UF" do §24.3).
  tribunal                    text,
  uf                          text check (uf is null or char_length(uf) = 2),

  desfecho_atual              boolean not null default false,
  desfecho_definitivo         boolean not null default false,

  created_by                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.desfechos_judiciais is
  'Linha do tempo de decisões judiciais por processo (§24) — múltiplos registros, nunca substitui o anterior. desfecho_atual/desfecho_definitivo: só um true por processo em cada, garantido em actions.ts.';
comment on column public.desfechos_judiciais.resultado_parte_assistida is
  'Sempre sob a perspectiva da parte assistida pela PERICONS — a mesma decisão pode ser favorável a uma parte e desfavorável à outra.';

alter table public.desfechos_judiciais enable row level security;
create policy "desfechos_judiciais_full_access" on public.desfechos_judiciais
  for all to authenticated using (true) with check (true);

create index desfechos_judiciais_processo_id_idx on public.desfechos_judiciais(processo_id, data_decisao);
-- Biblioteca de Decisões filtra por estes campos constantemente.
create index desfechos_judiciais_area_idx on public.desfechos_judiciais(area);
create index desfechos_judiciais_resultado_idx on public.desfechos_judiciais(resultado_parte_assistida);

-- ----------------------------------------------------------------------------
-- Documentos relacionados (§24.1 — distinto do anexo único "decisão
-- judicial"): acórdão, laudo, parecer, manifestação etc., também
-- reaproveitando a tabela `documentos` já existente via join simples.
-- ----------------------------------------------------------------------------
create table public.desfecho_documentos_relacionados (
  id            uuid primary key default gen_random_uuid(),
  desfecho_id   uuid not null references public.desfechos_judiciais(id) on delete cascade,
  documento_id  uuid not null references public.documentos(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (desfecho_id, documento_id)
);
alter table public.desfecho_documentos_relacionados enable row level security;
create policy "desfecho_documentos_relacionados_full_access" on public.desfecho_documentos_relacionados
  for all to authenticated using (true) with check (true);
create index desfecho_documentos_relacionados_desfecho_id_idx on public.desfecho_documentos_relacionados(desfecho_id);

-- ----------------------------------------------------------------------------
-- §24.5 — prazo configurável (dias) pro alerta de "desfecho judicial
-- pendente" na Central de Prazos. Mesma linha única de configuração já usada
-- pelo resto do Módulo de Relacionamento.
-- ----------------------------------------------------------------------------
alter table public.relacionamento_configuracoes add column prazo_dias_desfecho_judicial_pendente integer not null default 90;
comment on column public.relacionamento_configuracoes.prazo_dias_desfecho_judicial_pendente is
  '§24.5 — processo judicial com serviço PERICONS já entregue e sem desfecho atualizado há mais que isso entra na Central de Prazos.';
