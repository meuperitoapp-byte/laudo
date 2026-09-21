-- ============================================================================
-- Análise de Viabilidade — corrige ON DELETE dos FKs de documento-como-
-- evidência + adiciona validação de fato comprovado (§12)
-- ============================================================================
-- Ponto levantado pelo Jeferson antes de codar a fatia 3 (21/09/2026): as
-- colunas documento_id/arquivo_documento_id da migration 20260926120000
-- foram criadas com `on delete set null` — errado. Padrão já fixado no
-- Pós-Laudo (`pos_laudo_ponto_evidencias.documento_id`,
-- `pos_laudo_documentos.documento_id`, ver comentário de ambas): documento
-- citado como evidência NUNCA pode ser apagado em silêncio — sem `on
-- delete` (default NO ACTION) BLOQUEIA a exclusão do documento enquanto
-- ele estiver referenciado, obrigando a desvincular antes. `resposta_
-- evidencias.documento_id` (schema inicial, `on delete cascade`) é o
-- padrão ANTIGO, deliberadamente abandonado pelo Pós-Laudo — não é pra
-- reproduzir aqui.
--
-- Exceção: `caso_documentos_avaliados.documento_id` (já `on delete
-- cascade`) fica como está — essa tabela é só a AVALIAÇÃO do documento em
-- si (utilizado?/relevância), não uma citação de evidência pra outra
-- conclusão. Sem o documento, a avaliação não tem mais objeto — cascade é
-- o comportamento certo aí, não um esquecimento.

alter table public.caso_linha_tempo_medica
  drop constraint caso_linha_tempo_medica_documento_id_fkey,
  add constraint caso_linha_tempo_medica_documento_id_fkey
    foreign key (documento_id) references public.documentos(id);

alter table public.caso_fatos_comprovados
  drop constraint caso_fatos_comprovados_documento_id_fkey,
  add constraint caso_fatos_comprovados_documento_id_fkey
    foreign key (documento_id) references public.documentos(id);

alter table public.caso_causas_alternativas
  drop constraint caso_causas_alternativas_documento_id_fkey,
  add constraint caso_causas_alternativas_documento_id_fkey
    foreign key (documento_id) references public.documentos(id);

alter table public.caso_pontos_favoraveis
  drop constraint caso_pontos_favoraveis_documento_id_fkey,
  add constraint caso_pontos_favoraveis_documento_id_fkey
    foreign key (documento_id) references public.documentos(id);

alter table public.caso_tese_adversa
  drop constraint caso_tese_adversa_documento_id_fkey,
  add constraint caso_tese_adversa_documento_id_fkey
    foreign key (documento_id) references public.documentos(id);

alter table public.caso_literatura_utilizada
  drop constraint caso_literatura_utilizada_arquivo_documento_id_fkey,
  add constraint caso_literatura_utilizada_arquivo_documento_id_fkey
    foreign key (arquivo_documento_id) references public.documentos(id);

-- ============================================================================
-- Validação de fato comprovado (§12)
-- ============================================================================
-- O spec distingue CLASSIFICAÇÃO (comprovado/parcialmente/controvertido,
-- já existe) de VALIDAÇÃO: "somente conteúdo validado poderá migrar
-- automaticamente para o PDF sem nova revisão" — um fato pode estar
-- classificado como "comprovado" e ainda assim não ter sido formalmente
-- revisado/validado pela perita pra entrar no documento final sem checar
-- de novo. `validado_em`, não um boolean: mesmo padrão de honorarios_
-- recebidos_em/resolvido_em — nunca inferido, só preenchido quando ela
-- confirma explicitamente. null = ainda não validado (não presume nada).
alter table public.caso_fatos_comprovados
  add column validado_em timestamptz;

comment on column public.caso_fatos_comprovados.validado_em is
  '§12: só fatos com isto preenchido migram pro PDF sem exigir nova revisão na fatia 8. Preenchido manualmente pela perita, nunca inferido a partir de `classificacao`.';
