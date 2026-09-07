-- ============================================================================
-- Módulo Pós-Laudo — fatia 6 (gap): Seção I do modelo de Retificação de Erro
-- Material — "IDENTIFICAÇÃO DO DOCUMENTO RETIFICADO"
-- ============================================================================
-- Três campos da seção I que não tinham coluna equivalente (ficaram como
-- simplificação registrada na fatia 6; o Jeferson pediu pra fechar o gap).
-- Ficam em pos_laudo_ciclos, nível de ciclo (uma Retificação = um ciclo), ao
-- lado de retificacao_afeta_conclusao / retificacao_justificativa da
-- 20260907120000 — mesma família de campos.
--
--   * retificacao_id_documento          — o "ID do documento" da seção I: a
--                                         referência de protocolo do
--                                         documento pericial que está sendo
--                                         retificado (a perita digita — pode
--                                         não coincidir com
--                                         laudos_gerados.protocolo_id, que é
--                                         opcional e nem sempre foi
--                                         preenchido).
--
--   * retificacao_data_identificacao    — "Data da identificação do erro
--                                         material". `date`, mesmo tipo de
--                                         data_intimacao / prazo.
--
--   * retificacao_origem_identificacao  — "Origem da identificação": quem
--                                         identificou o erro. Conjunto
--                                         fechado do modelo (Perito / Juízo /
--                                         Autor / Réu / Outro) — CHECK, mesma
--                                         convenção da coluna `origem` desta
--                                         tabela.
--
-- Nenhuma linha existente quebra: as três são nullable, sem default. Nenhuma
-- é obrigatória pra gerar (o modelo não as marca "obrigatório", diferente da
-- seção IV) — a validação, se um dia for necessária, é de aplicação.
-- ============================================================================

alter table public.pos_laudo_ciclos
  add column retificacao_id_documento text,
  add column retificacao_data_identificacao date,
  add column retificacao_origem_identificacao text
    check (retificacao_origem_identificacao in ('perito', 'juizo', 'autor', 'reu', 'outro'));

comment on column public.pos_laudo_ciclos.retificacao_id_documento is
  'Seção I do modelo de Retificação — "ID do documento": referência de protocolo do documento pericial retificado, digitada pela perita.';
comment on column public.pos_laudo_ciclos.retificacao_data_identificacao is
  'Seção I do modelo de Retificação — "Data da identificação do erro material".';
comment on column public.pos_laudo_ciclos.retificacao_origem_identificacao is
  'Seção I do modelo de Retificação — "Origem da identificação" (perito / juizo / autor / reu / outro).';
