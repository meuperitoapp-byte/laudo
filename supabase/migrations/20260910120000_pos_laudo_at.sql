-- ============================================================================
-- Módulo Pós-Laudo — fatia 10 (schema): fluxo Assistência Técnica
-- ============================================================================
-- Ativa o fluxo `assistencia_tecnica` no mesmo módulo de pós-laudo, reusando
-- as fatias 1-9. As respostas da Dra. Fernanda que moldam esta fatia:
--
--   (a) A "posição da PERICONS sobre o laudo" NÃO precisa de histórico
--       versionado — basta constar em cada documento. => nenhuma linha nova em
--       pos_laudo_conclusoes_vigentes; a posição é um texto do ciclo
--       (posicao_pericons_sintese) que entra verbatim no documento gerado.
--
--   (b) O documento de AT NÃO é protocolado pelo sistema — quem protocola é o
--       advogado, externamente. Há uma janela entre a perita entregar e o
--       patrono protocolar de fato, durante a qual ela reedita "a mesma
--       página" e reentrega. => a saída AT é REGERADA IN-PLACE (mesma linha
--       laudos_gerados, mesmo id/versao, novo PDF/DOCX/snapshot) enquanto
--       protocolado = false. O trigger trg_laudos_gerados_congela (fatia 0) já
--       só compara conteúdo quando OLD.protocolado era true, então update
--       in-place com protocolado = false passa sem alteração no trigger.
--       O estado intermediário "entregue ao advogado, aguardando protocolo do
--       patrono" é entregue_ao_advogado_em (metadado operacional, NÃO congela).
--
--   (e) A análise de laudo em AT pode ser AVULSA (caso nunca acompanhado). =>
--       laudo_base_id continua null no AT; o laudo do perito judicial entra
--       como documentos + pos_laudo_documentos.papel = 'laudo_analisado'
--       (papel já existe desde a fatia 0). A base mínima do caso (objeto da
--       análise, tese da parte assistida) são campos do ciclo.
--
-- Item 7 (Jeferson): os quesitos suplementares AT saem DOS DOIS jeitos — como
-- seção embutida no parecer E como documento isolado 'Quesitos Suplementares'.
-- => novo valor 'quesitos_at' em laudos_gerados.tipo.
--
-- Nenhuma linha existente quebra: colunas novas nullable/‌com default; a
-- tabela pos_laudo_at_analise é nova; o CHECK de laudos_gerados.tipo ganha
-- 'quesitos_at' (nenhuma linha AT existe ainda). classificacao_global (coluna
-- da fatia 0) passa a ser obrigatória no fluxo AT — validação de aplicação,
-- não CHECK (o judicial mantém null).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. pos_laudo_ciclos — campos de nível de ciclo do fluxo AT
-- ----------------------------------------------------------------------------
alter table public.pos_laudo_ciclos
  add column objeto_analise            text,
  add column tese_assistida            text,
  add column providencia_recomendada   text[] not null default '{}',
  add column posicao_pericons_sintese  text;

comment on column public.pos_laudo_ciclos.objeto_analise is
  'Fluxo AT: o que o advogado pediu para analisar. Base mínima do caso avulso (resposta (e)). Null no judicial.';
comment on column public.pos_laudo_ciclos.tese_assistida is
  'Fluxo AT: a tese da parte assistida. Null no judicial.';
comment on column public.pos_laudo_ciclos.providencia_recomendada is
  'Fluxo AT: "Decisão pós-laudo" (Gestão Assistência Técnica.pdf §13). Vocabulário PosLaudoProvidenciaAt, validado na aplicação (mesmo padrão de natureza). Define quais saídas fazem sentido gerar.';
comment on column public.pos_laudo_ciclos.posicao_pericons_sintese is
  'Fluxo AT: a posição atual da PERICONS sobre o laudo, em uma frase. Entra verbatim no documento gerado. SEM log versionado (resposta (a) da Dra. Fernanda) — o histórico é só o conjunto de documentos.';


-- ----------------------------------------------------------------------------
-- 2. laudos_gerados — saída AT: modalidade + estado de entrega + tipo novo
-- ----------------------------------------------------------------------------
alter table public.laudos_gerados
  add column at_modalidade           text
    check (at_modalidade in (
      'concordancia',            -- Parecer de Concordância
      'concordancia_ressalvas',  -- Concordância com Ressalvas
      'impugnacao_parcial',      -- Impugnação Técnica Parcial
      'impugnacao_integral',     -- Impugnação Técnica Integral
      'divergente',              -- Parecer Divergente
      'manifestacao'             -- Manifestação Técnica (genérica)
    )),
  add column entregue_ao_advogado_em timestamptz;

comment on column public.laudos_gerados.at_modalidade is
  'Só tipo IN (parecer_at, manifestacao_at, impugnacao_at, parecer_divergente_at): a modalidade concreta do parecer AT, que escolhe o texto-base da conclusão no compilador. Null nos demais tipos. Faz parte do conteúdo do documento — congelada após protocolado (trg_laudos_gerados_congela).';
comment on column public.laudos_gerados.entregue_ao_advogado_em is
  'Fluxo AT: quando a saída foi entregue ao advogado. Estado intermediário antes de protocolado (o patrono protocola nos autos, fora do sistema). Metadado operacional — NÃO congela, pode ser corrigido/limpo mesmo depois.';

-- 'quesitos_at' no CHECK de tipo — documento isolado "Quesitos Suplementares"
-- do lado AT (item 7). O CHECK inline da fatia 0 tem o nome automático
-- laudos_gerados_tipo_check.
alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at. Discrimina a forma de snapshot_respostas.';


-- ----------------------------------------------------------------------------
-- 3. trg_laudos_gerados_congela — inclui at_modalidade no conteúdo congelado
-- ----------------------------------------------------------------------------
-- at_modalidade é conteúdo do documento (aparece na peça e escolhe o texto da
-- conclusão) — depois de protocolado não pode mudar. entregue_ao_advogado_em
-- fica FORA da lista de propósito (é operacional, como protocolo_id).
-- A transição protocolado false -> true continua passando: a comparação só
-- roda quando OLD.protocolado já era true.
create or replace function public.laudos_gerados_congela_protocolado()
returns trigger
language plpgsql
as $$
begin
  if old.protocolado then
    if new.storage_path_pdf   is distinct from old.storage_path_pdf
    or new.storage_path_docx  is distinct from old.storage_path_docx
    or new.snapshot_respostas is distinct from old.snapshot_respostas
    or new.tipo                is distinct from old.tipo
    or new.versao               is distinct from old.versao
    or new.substitui_conclusao is distinct from old.substitui_conclusao
    or new.pos_laudo_ciclo_id  is distinct from old.pos_laudo_ciclo_id
    or new.titulo               is distinct from old.titulo
    or new.paginas              is distinct from old.paginas
    or new.at_modalidade        is distinct from old.at_modalidade
    then
      raise exception
        'laudos_gerados %: versao ja protocolada — conteudo do documento (arquivo, snapshot, tipo, versao, substitui_conclusao, pos_laudo_ciclo_id, titulo, paginas, at_modalidade) nao pode ser alterado; protocolo_id/protocolado_em/entregue_ao_advogado_em continuam corrigiveis',
        old.id;
    end if;
  end if;
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. pos_laudo_at_analise — "Análise estruturada do laudo judicial" (1:1 ciclo)
-- ----------------------------------------------------------------------------
-- Gestão Assistência Técnica.pdf §12. Mesma decisão de pos_laudo_complementacao:
-- tabela 1:1 dedicada, não ~30 colunas em pos_laudo_ciclos. Cada eixo é um
-- boolean NULLABLE (null = não avaliado, ≠ false = avaliado e não há) + uma
-- nota de texto. O resultado global do laudo continua em
-- pos_laudo_ciclos.classificacao_global (coluna da fatia 0).
create table public.pos_laudo_at_analise (
  id                              uuid primary key default gen_random_uuid(),
  ciclo_id                        uuid not null unique references public.pos_laudo_ciclos(id) on delete cascade,

  conclusao_do_perito             text,

  respondeu_objeto                boolean,
  respondeu_objeto_nota           text,
  respondeu_quesitos              boolean,
  respondeu_quesitos_nota         text,
  considerou_documentos           boolean,
  considerou_documentos_nota      text,
  tem_omissoes                    boolean,
  tem_omissoes_nota               text,
  tem_contradicoes                boolean,
  tem_contradicoes_nota           text,
  tem_erros_tecnicos              boolean,
  tem_erros_tecnicos_nota         text,
  tem_erros_conceituais           boolean,
  tem_erros_conceituais_nota      text,
  extrapolou_objeto               boolean,
  extrapolou_objeto_nota          text,
  conclusoes_sem_fundamentacao    boolean,
  conclusoes_sem_fundamentacao_nota text,
  divergencia_literatura          boolean,
  divergencia_literatura_nota     text,
  tem_fato_novo                   boolean,
  tem_fato_novo_nota              text,
  favorece_tese                   boolean,
  favorece_tese_nota              text,
  prejudica_tese                  boolean,
  prejudica_tese_nota             text,

  impacto_processual              text,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table public.pos_laudo_at_analise is
  'Análise estruturada do laudo do perito judicial no fluxo AT (Gestão Assistência Técnica.pdf §12), 1:1 com o ciclo. O resultado global fica em pos_laudo_ciclos.classificacao_global.';

create trigger trg_set_updated_at
  before update on public.pos_laudo_at_analise
  for each row execute function public.set_updated_at();

alter table public.pos_laudo_at_analise enable row level security;
create policy "authenticated_full_access" on public.pos_laudo_at_analise
  for all to authenticated using (true) with check (true);
