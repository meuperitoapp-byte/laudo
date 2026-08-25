-- ============================================================================
-- Sistema de Laudos Periciais (Dra. Fernanda) — Schema inicial
-- ============================================================================
-- Gerado a partir da seção "Modelo de dados" do CLAUDE.md.
-- Genérico e template-driven: suporta os 10 tipos de laudo (3 já mapeados em
-- detalhe — Curatela, Previdenciário, Trabalhista — e 7 ainda por vir) sem
-- exigir remodelagem de schema quando os novos modelos chegarem.
--
-- IMPORTANTE: esta migration NÃO cria políticas de RLS. As tabelas têm RLS
-- habilitado (ver final do arquivo) mas sem nenhuma policy — ou seja, ninguém
-- acessa via API (anon/authenticated) até as policies serem criadas numa
-- etapa seguinte. Isso evita expor os dados assim que a anon key pública for
-- configurada no app, sem violar o combinado de "nada de policies ainda".
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Função utilitária: mantém updated_at em dia em qualquer UPDATE.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- tipos_laudo — catálogo dos 10 tipos de laudo (template)
-- ============================================================================
create table public.tipos_laudo (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,       -- ex.: 'curatela', 'previdenciario', 'trabalhista'
  nome        text not null,
  descricao   text,
  ordem       integer,
  ativo       boolean not null default true, -- os 7 ainda não mapeados existem no catálogo, mas ficam indisponíveis na UI
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.tipos_laudo is
  'Catálogo dos 10 tipos de laudo suportados. Cada linha é um template completo (seções + campos).';

create trigger trg_set_updated_at
  before update on public.tipos_laudo
  for each row execute function public.set_updated_at();


-- ============================================================================
-- secoes — seções de cada tipo de laudo (ordem, condicional ou não)
-- ============================================================================
create table public.secoes (
  id             uuid primary key default gen_random_uuid(),
  tipo_laudo_id  uuid not null references public.tipos_laudo(id) on delete cascade,
  codigo         text not null,   -- chave estável, única dentro do tipo_laudo (ex.: 'exame_clinico_geral')
  titulo         text not null,
  ordem          integer not null,
  condicional    boolean not null default false,
  condicao       jsonb,           -- ex.: {"campo_codigo": "objeto_pericia_dano_estetico", "valores_gatilho": ["sim"]}
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tipo_laudo_id, codigo)
);

comment on table public.secoes is
  'Seções de um tipo de laudo. Seções condicionais só aparecem na tela conforme "condicao".';
comment on column public.secoes.condicao is
  'Regra de visibilidade genérica: {"campo_codigo": "...", "valores_gatilho": [...]}. Null quando condicional = false.';

create index idx_secoes_tipo_laudo on public.secoes (tipo_laudo_id);

create trigger trg_set_updated_at
  before update on public.secoes
  for each row execute function public.set_updated_at();


-- ============================================================================
-- campos_secao — campos de cada seção
-- ============================================================================
create table public.campos_secao (
  id                          uuid primary key default gen_random_uuid(),
  secao_id                    uuid not null references public.secoes(id) on delete cascade,
  parent_campo_id             uuid references public.campos_secao(id) on delete cascade,
  codigo                      text not null,
  rotulo                      text not null,
  tipo_campo                  text not null
                                check (tipo_campo in ('selecao_unica', 'selecao_multipla', 'texto_livre', 'tabela')),
  ordem                       integer not null,
  obrigatorio                 boolean not null default false,
  aceita_texto_livre          boolean not null default true, -- regra: todo campo aceita texto livre p/ detalhamento
  opcoes                      jsonb,   -- selecao_unica/selecao_multipla: [{codigo, rotulo, texto_automatico}, ...]
  config_tabela               jsonb,   -- tipo_campo = 'tabela': {linhas: [...], colunas: [...]} (ex.: avaliação funcional 0-4/NA)
  condicional                 boolean not null default false,
  condicao                    jsonb,   -- mesma forma de secoes.condicao — não precisa ser o parent_campo_id
  requer_confirmacao_perito   boolean not null default false, -- marca campos de conclusão sensível (nexo causal, concausalidade)
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (secao_id, codigo)
);

comment on table public.campos_secao is
  'Campos de uma seção. parent_campo_id agrupa sub-campos (ex.: exame físico por sistema); condicao controla quando aparecem.';
comment on column public.campos_secao.parent_campo_id is
  'Agrupamento estrutural (ex.: sub-campos do sistema cardiovascular). Visibilidade real é controlada por "condicao", não por este campo.';
comment on column public.campos_secao.condicao is
  'Regra de visibilidade genérica: {"campo_codigo": "...", "valores_gatilho": [...]}. Usado tanto para sub-campos (parent_campo_id) quanto para campos condicionais cruzados.';
comment on column public.campos_secao.config_tabela is
  'Estrutura livre para tipo_campo = tabela. Ex. avaliação funcional: {"linhas": [{"codigo":"marcha","rotulo":"Marcha"}, ...], "colunas": [{"codigo":"escala","opcoes":["0","1","2","3","4","NA"]}]}.';
comment on column public.campos_secao.requer_confirmacao_perito is
  'Se true, a resposta correspondente (respostas_processo) exige confirmado_pelo_perito = true antes de entrar no laudo final.';

create index idx_campos_secao_secao on public.campos_secao (secao_id);
create index idx_campos_secao_parent on public.campos_secao (parent_campo_id);

create trigger trg_set_updated_at
  before update on public.campos_secao
  for each row execute function public.set_updated_at();


-- ============================================================================
-- processos — dados do processo (19 colunas)
-- ============================================================================
create table public.processos (
  id                            uuid primary key default gen_random_uuid(),

  tipo_trabalho                 text not null
                                   check (tipo_trabalho in ('pericia_judicial', 'assistencia_tecnica')),
  tipo_laudo_id                  uuid references public.tipos_laudo(id) on delete restrict,
  status                         text not null default 'em_andamento'
                                   check (status in ('em_andamento', 'finalizado', 'arquivado')),

  numero_processo                text,  -- nullable: Assistência Técnica pode não ter processo judicial formal ainda

  tipo_vara                      text
                                   check (tipo_vara in ('federal', 'estadual', 'trabalho')),
  vara_numero                    text,
  comarca_subsecao               text,  -- nome da Comarca ou da Subseção Judiciária, conforme tipo_vara
  uf                              text
                                   check (uf is null or char_length(uf) = 2),

  parte_autora                   text,
  partes_re                      text,

  periciando_nome                 text,
  periciando_cpf                  text,
  periciando_data_nascimento      date,

  objeto_pericia                  text,   -- pontos controvertidos, importado do despacho judicial
  etapas_contratadas              jsonb,  -- só p/ assistencia_tecnica: etapas contratadas (array de códigos)

  created_by                      uuid references auth.users(id) on delete set null,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table public.processos is
  'Cadastro do processo (Perícia Judicial ou Assistência Técnica). 19 colunas — ver CLAUDE.md > Modelo de dados.';
comment on column public.processos.etapas_contratadas is
  'Assistência Técnica: array de códigos das etapas contratadas (análise de viabilidade, parecer técnico, assistência técnica fase 1/2, quesitos, declaração, atestados).';

create index idx_processos_tipo_laudo on public.processos (tipo_laudo_id);

create trigger trg_set_updated_at
  before update on public.processos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- documentos — arquivos/imagens anexados (com ordem), incluindo assets globais
-- (assinatura da perita, logomarca da cliente) via processo_id nulo
-- ============================================================================
create table public.documentos (
  id                        uuid primary key default gen_random_uuid(),
  processo_id               uuid references public.processos(id) on delete cascade, -- null = asset global (assinatura/logo)
  tipo                      text not null
                              check (tipo in ('documento_processual', 'imagem_pericia', 'assinatura_perito', 'logomarca')),
  nome_arquivo              text not null,
  storage_path              text not null, -- caminho no Supabase Storage
  mime_type                 text,
  tamanho_bytes             bigint,
  ordem                     integer,
  ilegivel_insuficiente     boolean not null default false,
  observacao                text,
  enviado_por               uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.documentos is
  'Documentos/imagens por processo. processo_id nulo = asset global da conta (assinatura_perito, logomarca), não um anexo de processo.';
comment on column public.documentos.ilegivel_insuficiente is
  'Alerta "documento ilegível/insuficiente sem observação" é validado na aplicação (checklist pré-finalização), não via CHECK constraint aqui — o fluxo permite salvar rascunho sem observação ainda preenchida.';

create index idx_documentos_processo on public.documentos (processo_id);

create trigger trg_set_updated_at
  before update on public.documentos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- respostas_processo — o que foi efetivamente preenchido em cada processo
-- ============================================================================
create table public.respostas_processo (
  id                       uuid primary key default gen_random_uuid(),
  processo_id              uuid not null references public.processos(id) on delete cascade,
  campo_id                 uuid not null references public.campos_secao(id) on delete restrict,
  valor_selecionado        jsonb,  -- string (seleção única) | array (seleção múltipla) | linhas (tabela)
  texto_livre              text,   -- detalhamento/individualização (todo campo aceita)
  texto_narrativo          text,   -- narrativo gerado a partir da marcação; editável pelo perito antes de finalizar
  confirmado_pelo_perito   boolean not null default false, -- exigido quando campos_secao.requer_confirmacao_perito = true
  respondido_por           uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (processo_id, campo_id)
);

comment on table public.respostas_processo is
  'Respostas dadas a cada campo, por processo. texto_narrativo é o texto automático já editado/aprovado pelo perito.';

create index idx_respostas_processo_processo on public.respostas_processo (processo_id);
create index idx_respostas_processo_campo on public.respostas_processo (campo_id);

create trigger trg_set_updated_at
  before update on public.respostas_processo
  for each row execute function public.set_updated_at();


-- ============================================================================
-- resposta_evidencias — rastreabilidade: liga uma conclusão (resposta) aos
-- elementos documentais/clínicos que a sustentam
-- ============================================================================
create table public.resposta_evidencias (
  id                          uuid primary key default gen_random_uuid(),
  resposta_id                 uuid not null references public.respostas_processo(id) on delete cascade,
  documento_id                uuid references public.documentos(id) on delete cascade,
  resposta_referenciada_id    uuid references public.respostas_processo(id) on delete cascade,
  observacao                  text,
  created_at                  timestamptz not null default now(),
  check (documento_id is not null or resposta_referenciada_id is not null),
  check (resposta_referenciada_id is distinct from resposta_id)
);

comment on table public.resposta_evidencias is
  'Vincula uma resposta-conclusão (ex.: nexo causal) a um documento e/ou a outra resposta (achado clínico/ocupacional) que a sustenta.';

create index idx_resposta_evidencias_resposta on public.resposta_evidencias (resposta_id);
create index idx_resposta_evidencias_documento on public.resposta_evidencias (documento_id);
create index idx_resposta_evidencias_resposta_ref on public.resposta_evidencias (resposta_referenciada_id);


-- ============================================================================
-- respostas_reutilizaveis — biblioteca de respostas reaproveitáveis
-- ============================================================================
create table public.respostas_reutilizaveis (
  id              uuid primary key default gen_random_uuid(),
  campo_id        uuid references public.campos_secao(id) on delete cascade,     -- nullable: preso a um campo específico
  tipo_laudo_id   uuid references public.tipos_laudo(id) on delete cascade,      -- nullable: texto genérico do tipo de laudo (ex.: metodologia)
  titulo          text not null,
  conteudo        text not null,
  criado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.respostas_reutilizaveis is
  'Biblioteca de textos reaproveitáveis entre processos. campo_id preso a um campo específico; tipo_laudo_id p/ textos mais genéricos.';

create index idx_respostas_reutilizaveis_campo on public.respostas_reutilizaveis (campo_id);
create index idx_respostas_reutilizaveis_tipo_laudo on public.respostas_reutilizaveis (tipo_laudo_id);

create trigger trg_set_updated_at
  before update on public.respostas_reutilizaveis
  for each row execute function public.set_updated_at();


-- ============================================================================
-- quesitos — pergunta colada + resposta, por processo (campo aberto)
-- ============================================================================
create table public.quesitos (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos(id) on delete cascade,
  origem        text,   -- juízo/parte autora/parte ré etc. — texto livre, não é lista fixa
  pergunta      text not null,
  resposta      text,
  ordem         integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.quesitos is
  'Quesitos do processo: pergunta colada + resposta. Alerta "quesito sem resposta" é checado na aplicação (resposta is null).';

create index idx_quesitos_processo on public.quesitos (processo_id);

create trigger trg_set_updated_at
  before update on public.quesitos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- laudos_gerados — versões finais geradas (PDF/Word) por processo
-- ============================================================================
create table public.laudos_gerados (
  id                   uuid primary key default gen_random_uuid(),
  processo_id          uuid not null references public.processos(id) on delete cascade,
  versao               integer not null,
  storage_path_pdf     text,
  storage_path_docx    text,
  snapshot_respostas   jsonb,  -- congela o conteúdo compilado no momento da geração (auditoria/histórico)
  gerado_por           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (processo_id, versao)
);

comment on table public.laudos_gerados is
  'Versões finais geradas do laudo. snapshot_respostas congela o conteúdo no momento da geração, para editar respostas depois não alterar retroativamente uma versão já entregue.';


-- ============================================================================
-- RLS: habilitado, SEM policies. Ninguém acessa via anon/authenticated até a
-- próxima etapa (criação das policies). Acesso via service_role (server-side)
-- continua funcionando normalmente, pois RLS não se aplica a esse papel.
-- ============================================================================
alter table public.tipos_laudo            enable row level security;
alter table public.secoes                  enable row level security;
alter table public.campos_secao            enable row level security;
alter table public.processos               enable row level security;
alter table public.documentos              enable row level security;
alter table public.respostas_processo      enable row level security;
alter table public.resposta_evidencias     enable row level security;
alter table public.respostas_reutilizaveis enable row level security;
alter table public.quesitos                enable row level security;
alter table public.laudos_gerados          enable row level security;
