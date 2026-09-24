-- ============================================================================
-- Quesitos — documento final (24/09/2026) — 3º módulo do lote PERICONS,
-- modelo em "PERICONS_MODELO_ENXUTO_APRESENTACAO_QUESITOS.pdf".
--
-- Feedback da Dra. Fernanda: a janela hoje só deixa adicionar quesitos; o
-- documento final (PDF/Word) precisa trazer endereçamento + síntese da tese
-- + o que precisa ser demonstrado em perícia + a lista ordenada. `apresentar`
-- controla quais quesitos entram no documento sem precisar excluir da lista
-- de trabalho (ela pode ter quesitos em rascunho ainda não aprovados).
-- ============================================================================

alter table public.quesitos
  add column apresentar boolean not null default true;

comment on column public.quesitos.apresentar is
  'Controla se o quesito entra no documento final gerado (quesitos_documentos) sem precisar excluir da lista de trabalho.';

create table public.quesitos_documentos (
  id                          uuid primary key default gen_random_uuid(),
  processo_id                 uuid not null references public.processos(id) on delete cascade unique,

  parte_selecionada           text check (parte_selecionada in ('autora', 're', 'reclamante', 'reclamada', 'parte_assistida')),
  -- Documento vai ao Juízo — AT não tem vara/comarca estruturada (só Perícia
  -- Judicial tem), então o endereçamento aqui é texto livre digitado pela perita.
  endereco_juizo              text,
  -- §"Quando houver despacho saneador" — opcional, um ponto por linha.
  pontos_controvertidos       text,
  sintese_tese                text,
  o_que_demonstrar_pericia    text,

  local_emissao               text,
  data_emissao                date,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.quesitos_documentos is
  'Hub do documento final de Quesitos (1 por processo) — a lista de perguntas em si continua em quesitos (apresentar=true entra no PDF).';

alter table public.quesitos_documentos enable row level security;
create policy "quesitos_documentos_full_access" on public.quesitos_documentos
  for all to authenticated using (true) with check (true);
