-- ============================================================================
-- configuracoes — rodapé como texto livre (uma linha por tipo de trabalho)
-- ============================================================================
-- A Dra. Fernanda definiu o texto EXATO de cada rodapé, e os dois formatos não
-- seguem o mesmo template (rótulos e pontuação diferentes, "Contatos: email"
-- só num deles, sem Instagram em nenhum). É decisão editorial, não estrutural:
-- em vez de compor a linha a partir de e-mail/telefone/instagram, guarda-se a
-- LINHA COMPLETA como texto livre, editável pela tela de Configurações.
--
-- As 6 colunas estruturadas da migration 20260901120000 nunca chegaram a ser
-- preenchidas (a tela acabou de ser criada) — dropar não perde dado.
-- ============================================================================

alter table public.configuracoes
  drop column if exists contato_judicial_email,
  drop column if exists contato_judicial_telefone,
  drop column if exists contato_judicial_instagram,
  drop column if exists contato_at_email,
  drop column if exists contato_at_telefone,
  drop column if exists contato_at_instagram,
  add column if not exists rodape_judicial_texto text,
  add column if not exists rodape_at_texto text;

comment on column public.configuracoes.rodape_judicial_texto is
  'Linha exata do rodapé dos documentos de Perícia Judicial. Texto livre — usado sem transformação.';
comment on column public.configuracoes.rodape_at_texto is
  'Linha exata do rodapé dos documentos de Assistência Técnica. Texto livre — usado sem transformação.';
