-- ============================================================================
-- Fluxo Principal do Perito Judicial — fatia seguinte: 3 novos valores em
-- laudos_gerados.tipo (Manifestação Consolidada, Impossibilidade de Assumir
-- o Encargo, Escusa/Declínio do Encargo Já Aceito) + a coluna de liberação
-- que ficou decidida no plano (coluna própria, sem reaproveitar
-- deposito_forma_disponibilizacao — decisão do Jeferson, 11/09/2026).
-- ============================================================================
-- 'manifestacao_inicial': documento composto que agrupa Aceite/Honorários/
-- Depósito/Agendamento conforme os módulos marcados pela perita — nenhuma
-- coluna nova em `processos` pra isso; a lista de módulos de cada versão
-- fica gravada no próprio snapshot_respostas (jsonb já existente), não numa
-- coluna estruturada — ver SnapshotManifestacaoInicial em types/json-fields.ts.
--
-- 'impossibilidade_assumir' (nº12 da Biblioteca de Expedientes Periciais) e
-- 'escusa_declinio_pericial' (nº13) são os dois destinos reais da trava do
-- Aceite (plano §4.1), escolhidos conforme `aceitou_nomeacao` já é 'sim'
-- (Escusa/Declínio, documento pressupõe aceitação anterior) ou ainda não
-- (Impossibilidade de Assumir, documento é pra ANTES de aceitar). Os dois
-- têm só campos de texto livre (motivo, e no nº13 também pendências) que
-- NÃO viram coluna em `processos` — entram na tela de geração e ficam
-- congelados no snapshot da própria versão gerada, exatamente pelo mesmo
-- motivo do 'manifestacao_inicial': é conteúdo do documento, não estado do
-- processo. Gerar um dos dois NÃO altera `aceitou_nomeacao` sozinho — se
-- algo mudar depois, é uma decisão separada, tomada no protocolar, não
-- aqui.
-- ============================================================================

alter table public.laudos_gerados
  drop constraint laudos_gerados_tipo_check;
alter table public.laudos_gerados
  add constraint laudos_gerados_tipo_check check (tipo in (
    'laudo', 'esclarecimentos', 'retificacao', 'complementacao',
    'parecer_at', 'manifestacao_at', 'impugnacao_at', 'parecer_divergente_at',
    'quesitos_at',
    'aceite_pericial', 'dados_deposito', 'agendamento_pericia',
    'manifestacao_inicial', 'impossibilidade_assumir', 'escusa_declinio_pericial'
  ));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at | quesitos_at | aceite_pericial | dados_deposito | agendamento_pericia | manifestacao_inicial | impossibilidade_assumir | escusa_declinio_pericial. Discrimina a forma de snapshot_respostas.';

-- `liberacao_forma` (trilho financeiro até liberação, nº23 da Biblioteca)
-- fica pra quando essa fatia entrar de fato, na ordem já combinada
-- (Consolidada -> Não Comparecimento -> Liberação -> régua enxuta) — não
-- adianto schema de fatia que ainda não chegou, mesmo já tendo a decisão
-- tomada (coluna própria, ver plano §5.1).
