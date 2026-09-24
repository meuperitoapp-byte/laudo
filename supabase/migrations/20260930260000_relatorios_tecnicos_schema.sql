-- ============================================================================
-- Relatório Técnico (24/09/2026) — 4º módulo do lote PERICONS, modelo em
-- "MODELO_PADRAO_RELATORIO_TECNICO_PERICONS_COM_RESPOSTAS_PADRAO.pdf".
-- Mesmo espírito do Atestado: documento sucinto (2-5 páginas), campos
-- complementares condicionais (só aparecem no PDF se marcados e
-- preenchidos), biblioteca de respostas padrão sempre editável.
-- ============================================================================

create table public.relatorios_tecnicos (
  id                          uuid primary key default gen_random_uuid(),
  processo_id                 uuid not null references public.processos(id) on delete cascade unique,

  -- I — Identificação/Objeto.
  solicitante                 text,
  objeto_relatorio            text,
  questao_tecnica_principal   text,

  -- II — Documentos analisados (reaproveita os já anexados ao processo).
  documentos_referenciados    uuid[] not null default '{}',
  documentacao_suficiente     text check (documentacao_suficiente in ('sim', 'parcialmente', 'nao')),
  documentacao_suficiente_detalhe text,

  -- III — Síntese técnica do caso.
  sintese_tecnica_caso        text,

  -- IV — Análise técnica + campos complementares opcionais (só entram no PDF se marcados).
  analise_tecnica             text,
  campos_complementares       text[] not null default '{}',
  campo_diagnostico_cid       text,
  campo_conduta               text,
  campo_nexo_causal           text,
  campo_dano                  text,
  campo_incapacidade          text,
  campo_tratamento            text,
  campo_prognostico           text,

  -- V — Conclusão.
  conclusao                   text,

  -- Documentos/providências complementares.
  documentos_complementares_texto text,

  local_emissao               text,
  data_emissao                date,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.relatorios_tecnicos is
  'Relatório Técnico (1 por processo) — modelo sucinto com respostas padrão editáveis. Modelo: MODELO_PADRAO_RELATORIO_TECNICO_PERICONS_COM_RESPOSTAS_PADRAO.pdf.';

alter table public.relatorios_tecnicos enable row level security;
create policy "relatorios_tecnicos_full_access" on public.relatorios_tecnicos
  for all to authenticated using (true) with check (true);
