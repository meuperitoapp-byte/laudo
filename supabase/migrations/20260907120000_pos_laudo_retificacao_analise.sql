-- ============================================================================
-- Módulo Pós-Laudo — fatia 6: Análise da Repercussão da Retificação de Erro
-- Material (seção IV do modelo)
-- ============================================================================
-- "Esta é a principal trava de segurança do módulo e deverá ser de
-- preenchimento obrigatório" (MODELO_RETIFICACAO_DE_ERRO_MATERIAL.pdf, seção
-- IV). Pergunta EXPLÍCITA à perita, nunca inferência do sistema — por isso é
-- campo próprio, não derivado de repercussao_laudo (que mede a repercussão de
-- uma MANIFESTAÇÃO sendo esclarecida — conceito diferente) nem de
-- natureza_erro dos itens (categoria do erro, não diz se ele repercute).
--
--   * retificacao_afeta_conclusao — a resposta NÃO/SIM de "a correção
--                                   identificada interfere na fundamentação
--                                   técnico-pericial ou na conclusão do
--                                   documento original?". `null` = ainda não
--                                   respondida. SIM bloqueia a geração da
--                                   Retificação (REGRA DE BLOQUEIO do
--                                   modelo): o caso é redirecionado pra
--                                   Complementação — sem migração de dado,
--                                   os itens de pos_laudo_retificacao_itens
--                                   já nasceram presos ao ciclo, não à saída
--                                   (ver comentário daquela tabela, fatia 0).
--
--   * retificacao_justificativa   — texto livre que sustenta a resposta
--                                   acima. O modelo pede UMA justificativa
--                                   pras duas respostas (não só pro SIM):
--                                   quando NÃO, ela entra verbatim no corpo
--                                   do documento gerado (seção IV) — é a
--                                   declaração técnica de que a correção não
--                                   afeta a conclusão, o que sustenta a peça
--                                   se for questionada depois. Quando SIM,
--                                   fica registrada no ciclo e alimenta a
--                                   Complementação (fatia 7) quando ela
--                                   existir.
--
-- Nenhuma linha existente quebra: as duas colunas são nullable, sem default,
-- sem CHECK novo — a exigência de "as duas preenchidas antes de gerar" é
-- regra de aplicação (mesmo padrão de repercussao_laudo/conclusao_vigente_nova,
-- migration 20260906120000), não invariante de linha. Sem CHECK cruzando
-- pos_laudo_conclusoes_vigentes.origem_tipo: a garantia de que Retificação
-- nunca cria Nova Conclusão Vigente já está estruturalmente travada desde a
-- fatia 0 ('retificacao' ausente daquele CHECK) e continua intocada.
-- ============================================================================

alter table public.pos_laudo_ciclos
  add column retificacao_afeta_conclusao boolean,
  add column retificacao_justificativa text;

comment on column public.pos_laudo_ciclos.retificacao_afeta_conclusao is
  'Seção IV do modelo de Retificação de Erro Material — "a correção interfere na fundamentação/conclusão?". Pergunta explícita à perita (nunca inferida). null = ainda não respondida. true (SIM) bloqueia a geração da Retificação e aponta para a Complementação do Laudo (fatia 7) — sem mover pos_laudo_retificacao_itens, que já é chaveada só por ciclo_id.';
comment on column public.pos_laudo_ciclos.retificacao_justificativa is
  'Justificativa da resposta acima (obrigatória nas duas respostas pelo modelo). Quando a resposta é NÃO, entra verbatim no corpo do documento de Retificação gerado (seção IV) — é a declaração técnica que sustenta a peça.';
