-- ============================================================================
-- Ajustes de schema motivados pelo mapeamento do modelo Curatela
-- ============================================================================
-- Decisões tomadas com a Dra. Fernanda antes deste seed (ver conversa):
--
-- 1) secoes.texto_automatico_template — várias seções do modelo (ex.: IX
--    Exame Clínico Geral, X Exame do Estado Mental) têm um parágrafo único
--    combinando respostas de VÁRIOS campos daquela seção, diferente do
--    texto_automatico por opção que já existia em campos_secao.opcoes (que
--    continua existindo e sendo usado, ex.: Seção XVIII - Conclusão). Guarda
--    esse template com placeholders {{codigo_do_campo}}, resolvidos pela
--    aplicação ao montar respostas_processo.texto_narrativo. Também serve
--    para blocos de texto fixo sem placeholder nenhum (ex.: Seções IV, V, XI,
--    XIX têm parágrafos padrão que não variam com a resposta).
alter table public.secoes
  add column texto_automatico_template text;

comment on column public.secoes.texto_automatico_template is
  'Template de texto narrativo da seção inteira. Placeholders {{codigo_do_campo}} podem referenciar qualquer campo do mesmo tipo_laudo (não só da própria seção) ou tokens computados pela aplicação (ex.: {{total_documentos}}, quando a seção não tem campos_secao próprios). Usado para pré-preencher texto_narrativo antes da edição do perito. Pode ser um texto fixo, sem placeholder nenhum.';

-- 2) documentos — colunas para suportar a "Matriz de Documentos Analisados"
--    reaproveitando a tabela documentos em vez de duplicar o conceito em
--    campos_secao/respostas_processo. A seção correspondente (ex.: Curatela
--    VI) fica estrutural, sem campos_secao — a aplicação lista os documentos
--    do processo (tipo = 'documento_processual') naquele ponto do laudo
--    compilado, usando estas colunas.
alter table public.documentos
  add column categoria            text,
  add column origem_profissional  text,
  add column data_documento       date,
  add column paginas              integer;

comment on column public.documentos.categoria is
  'Categoria do documento para a Matriz de Documentos Analisados (ex.: petição inicial, prontuário hospitalar, relatório médico). O vocabulário varia por tipo_laudo — não é um CHECK aqui, fica como config de UI/feature.';
