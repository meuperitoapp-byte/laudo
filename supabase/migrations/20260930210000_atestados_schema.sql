-- ============================================================================
-- Atestado/Declaração médico-pericial (24/09/2026) — modelo enviado pela
-- Dra. Fernanda em "MODELO_PADRAO_ATESTADO_MEDICO_PERICIAL_PERICONS.pdf".
-- Mesma estrutura pra "Atestado" e "Declaração" (ela pediu os dois juntos:
-- "apenas o cabeçalho e seguir o documento em pdf que mandarei") — só o
-- título muda, por isso `tipo_documento` em vez de duas tabelas.
--
-- Regra do modelo (seção "REGRAS PARA PARAMETRIZAÇÃO NO SISTEMA"): nenhum
-- atestado é emitido automaticamente — sempre exige validação/edição da
-- perita antes de gerar o PDF. Campos condicionais por finalidade abrem só
-- quando marcados (feito na aplicação, não no banco). Documento final curto
-- (1-2 páginas), só com o que foi efetivamente marcado.
-- ============================================================================

create table public.atestados (
  id                                    uuid primary key default gen_random_uuid(),
  processo_id                           uuid not null references public.processos(id) on delete cascade,
  tipo_documento                        text not null check (tipo_documento in ('atestado', 'declaracao')),

  -- Finalidade (múltipla) — abre os blocos condicionais correspondentes.
  finalidades                           text[] not null default '{}',
  finalidade_outra_descricao            text,

  -- Elementos médicos analisados — reaproveita documentos já anexados ao processo.
  documentos_referenciados              uuid[] not null default '{}',

  -- Condição médica.
  data_avaliacao                        date,
  diagnostico                           text,
  cid                                   text,
  condicao_atual                        text,
  repercussao_funcional                 text,

  -- Conclusão médico-pericial (modelos A-F do documento) — sempre editável.
  conclusao_modelo                      text check (conclusao_modelo in (
                                           'capacidade_preservada', 'incapacidade_temporaria', 'inconclusiva',
                                           'capacidade_funcional', 'necessidade_assistencia', 'ausencia_necessidade_assistencia'
                                         )),
  conclusao_texto                       text,

  -- Capacidade civil / autonomia — só relevante quando finalidade inclui 'capacidade_civil'.
  cc_consciencia                        text,
  cc_orientacao                         text,
  cc_memoria                            text,
  cc_compreensao                        text,
  cc_juizo_critico                      text,
  cc_capacidade_decisoria               text,
  cc_comunicacao                        text,
  cc_autonomia_avd                      text,
  cc_necessidade_terceiros              text check (cc_necessidade_terceiros in ('sim', 'nao', 'parcial')),
  capacidade_civil_texto                text,

  -- Conclusão final + complementos opcionais (3 checkboxes do modelo).
  conclusao_final                       text,
  complemento_reavaliacao_periodo       text,
  complemento_condicao_na_data          boolean not null default false,
  complemento_limitada_elementos        boolean not null default false,

  -- Local/data de emissão — assinatura reaproveita a imagem já configurada em Configurações.
  local_emissao                         text,
  data_emissao                          date,

  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now(),

  unique (processo_id, tipo_documento)
);

comment on table public.atestados is
  'Atestado/Declaração médico-pericial — mesma estrutura pros dois tipos (tipo_documento distingue). Modelo: MODELO_PADRAO_ATESTADO_MEDICO_PERICIAL_PERICONS.pdf.';

alter table public.atestados enable row level security;

create policy "atestados_full_access" on public.atestados
  for all to authenticated using (true) with check (true);

-- Novo tipo em laudos_gerados.tipo (mesmo padrão de extensão já usado várias vezes).
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
    'atestado', 'declaracao'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial | nao_comparecimento | pedido_liberacao | analise_viabilidade | atestado | declaracao. Discrimina a forma de snapshot_respostas.';
