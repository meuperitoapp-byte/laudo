-- ============================================================================
-- Assistência Técnica — ação por etapa (item 2 do lote pós-Fase-2, 21/09/2026).
-- Design aprovado pelo Jeferson: sequência das 12 etapas continua só visual
-- (ordem fixa na tela, sem bloqueio real entre elas — perícia na prática nem
-- sempre é linear); só 2 das 12 etapas têm ação própria, as outras 5 ("Fase
-- 2": Parecer técnico, Relatório técnico, Manifestação ao laudo pericial,
-- Quesitos suplementares, Participação da perícia) já são cobertas pelo
-- ciclo de Pós-Laudo (fluxo assistencia_tecnica) — não duplicar aqui.
-- ============================================================================
-- `processos.estrategia_pericial_reuniao_em` (date, nullable): data da
-- reunião de explicações técnicas com o advogado, etapa "Estratégia
-- pericial". Mesmo padrão de documentos_solicitados_em/honorarios_proximo_
-- marco_em — preenchida e limpa manualmente por ela, nunca inferida. Só a
-- data (sem local/modalidade/participantes — não pedido).
--
-- `documentos.etapa_at` (text, nullable): marca que um documento enviado
-- pertence a uma etapa específica de Assistência Técnica — usado agora só
-- pela "Análise da contestação" (o arquivo que o advogado manda), mas
-- guarda o código da etapa (mesmo vocabulário de EtapaContratada em
-- enums.ts) pra servir outras etapas no futuro sem migration nova.
-- Deliberadamente SEPARADO de `documentos.categoria` (que já tem outro job:
-- alimenta a Matriz de Documentos Analisados do laudo judicial, Seção VI) —
-- misturar os dois conceitos quebraria a sugestão de categoria existente.
-- ============================================================================

alter table public.processos
  add column estrategia_pericial_reuniao_em date;

comment on column public.processos.estrategia_pericial_reuniao_em is
  'Só Assistência Técnica, etapa "Estratégia pericial". Data da reunião de explicações técnicas com o advogado — preenchida e limpa manualmente, nunca inferida. Null = reunião ainda não marcada.';

alter table public.documentos
  add column etapa_at text;

comment on column public.documentos.etapa_at is
  'Só Assistência Técnica: código da etapa contratada (vocabulário de EtapaContratada, enums.ts) à qual este documento pertence — hoje só usado por "analise_contestacao". Null = documento não vinculado a etapa nenhuma (fluxo normal de Documentos). Independente de `categoria`, que serve a Matriz de Documentos Analisados do laudo judicial.';
