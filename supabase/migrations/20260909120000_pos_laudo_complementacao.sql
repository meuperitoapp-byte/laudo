-- ============================================================================
-- Módulo Pós-Laudo — fatia 7: Complementação do Laudo Médico-Pericial
-- ============================================================================
-- Baseado em MODELO_COMPLEMENTACAO_AO_LAUDO_MEDICO_PERICIAL.pdf (seções I–XI).
--
-- Uma tabela 1:1 com o ciclo (não ~25 colunas em pos_laudo_ciclos) — mesma
-- lógica de por que pos_laudo_retificacao_itens é tabela à parte. Guarda os
-- campos ESPECÍFICOS da Complementação; o resto vem de onde já está:
--
--   * Seção I ("Data da intimação", "Origem", "Versão", "Data do protocolo do
--     laudo original") — de pos_laudo_ciclos (Registro da Demanda) e de
--     laudos_gerados (laudo_base). Só "Documento/intimação que originou: ID"
--     ganha campo aqui (id_documento_origem).
--   * Seção III (tabela de elementos supervenientes) — é pos_laudo_documentos
--     (fatia 3). Aqui fica só a SÍNTESE de ciclo (impacto + fundamentação).
--   * Seção IX (repercussão sobre o laudo original) + X (conclusão
--     complementar) — REUSAM pos_laudo_ciclos.repercussao_laudo (o mesmo
--     enum de 6 valores da fatia 4) e conclusao_vigente_nova. É AQUI que
--     'substituicao_conclusao' finalmente vale (era barrado nos
--     Esclarecimentos). podeGerarSaida (regras.ts) já é a trava da Nova
--     Conclusão Vigente — sem coluna nova.
--   * Seção VIII (quesitos) — pos_laudo_quesitos, ainda sem CRUD (fatia 9);
--     seção sempre ausente por ora, como nos Esclarecimentos.
--
-- Nenhuma linha existente quebra: tabela nova, sem tocar em nada. RLS no
-- mesmo padrão das outras 7 tabelas do módulo.
-- ============================================================================

create table public.pos_laudo_complementacao (
  id                        uuid primary key default gen_random_uuid(),
  ciclo_id                  uuid not null unique references public.pos_laudo_ciclos(id) on delete cascade,

  -- I — Identificação da Complementação
  id_documento_origem       text,   -- "Documento/intimação que originou a complementação: ID"

  -- II — Motivo e Delimitação
  -- vocabulário (app-validado, mesmo padrão de pos_laudo_ciclos.natureza):
  --   documento_novo, nova_avaliacao, exame_complementar, avaliacao_especialista,
  --   diligencia_juizo, determinacao_judicial, insuficiencia_tecnica,
  --   esclarecimento_ampliado, outro
  motivos                   text[] not null default '{}',
  motivo_descricao          text,

  -- III — síntese sobre os elementos supervenientes (a tabela é pos_laudo_documentos)
  impacto_elementos         text
    check (impacto_elementos in (
      'sem_relevancia_modificadora',
      'complementares',
      'relevantes_fundamentacao',
      'potencialmente_modificadores',
      'determinantes_revisao_parcial',
      'determinantes_revisao_integral'
    )),
  impacto_fundamentacao     text,

  -- IV — Nova avaliação médico-pericial (condicional: só entra no documento com avaliacao_realizada=true)
  avaliacao_realizada       boolean not null default false,
  avaliacao_data            date,
  avaliacao_horario         text,
  avaliacao_local           text,
  avaliacao_presentes       text,
  avaliacao_assistentes     text,
  avaliacao_documentos_ato  text,
  avaliacao_achados         text,
  avaliacao_comparacao      text,

  -- V — Exames complementares / avaliação especializada (condicional: exames_realizados=true)
  exames_realizados         boolean not null default false,
  exame_descricao           text,
  exame_data                date,
  exame_profissional        text,
  exame_resultado           text,
  exame_repercussao         text,

  -- VI — Análise técnico-pericial complementar
  vi_mantidos               text,
  vi_necessitam             text,
  vi_revistos               text,
  vi_fundamentacao          text,

  -- VII — Repercussão sobre os elementos centrais da perícia
  -- jsonb com chaves fixas: diagnostico, conduta, nexo, dano, incapacidade,
  -- prognostico, outros. Cada uma: { situacao, fundamentacao } com
  -- situacao ∈ ('mantido','complementado','modificado','nao_aplicavel').
  -- 'outros' é texto livre (só { fundamentacao }).
  vii_elementos             jsonb not null default '{}'::jsonb,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.pos_laudo_complementacao is
  'Campos específicos da Complementação do Laudo (seções II–VII do modelo), 1:1 com o ciclo. Seções I/IX/X reusam pos_laudo_ciclos + laudos_gerados; seção III (tabela) é pos_laudo_documentos.';

create trigger trg_set_updated_at
  before update on public.pos_laudo_complementacao
  for each row execute function public.set_updated_at();

alter table public.pos_laudo_complementacao enable row level security;
create policy "authenticated_full_access" on public.pos_laudo_complementacao
  for all to authenticated using (true) with check (true);
