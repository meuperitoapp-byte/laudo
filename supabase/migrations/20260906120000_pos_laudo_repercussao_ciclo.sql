-- ============================================================================
-- Módulo Pós-Laudo — fatia 4: repercussão de nível de ciclo + Nova Conclusão
-- Vigente (rascunho)
-- ============================================================================
-- Os campos POR PONTO (resposta_tecnica, repercussao) já existem desde
-- 20260905120000_pos_laudo_schema.sql — a fatia 4 só os expõe na UI, sem
-- schema novo pra eles. Esta migration acrescenta apenas o nível de CICLO.
--
--   * repercussao_laudo       — a síntese que a perita escreve DEPOIS de
--                               responder todos os pontos: "Análise da
--                               Repercussão sobre o Laudo Original" (seção VI
--                               do modelo de Esclarecimentos, obrigatória; a
--                               Complementação, seção IX, acrescenta a opção
--                               de substituição integral da conclusão).
--                               É preenchida pela perita. O sistema só SUGERE
--                               (aviso visual, no mesmo modelo do
--                               rascunho_complementacao) — nunca preenche nem
--                               deriva sozinho. Não é derivada do campo de
--                               triagem pode_modificar_conclusao (que é
--                               registro histórico do que ela pensou ANTES de
--                               analisar).
--
--   * conclusao_vigente_nova  — RASCUNHO da "Nova Conclusão Vigente",
--                               digitado pela perita quando repercussao_laudo
--                               indica alteração da conclusão. NÃO é a
--                               conclusão vigente: é texto de trabalho no
--                               ciclo. Só vira linha em
--                               pos_laudo_conclusoes_vigentes quando o
--                               documento de pós-laudo que a carrega é
--                               PROTOCOLADO — e aí o trigger de supersessão
--                               da fatia 0 (trg_pos_laudo_conclusao_supersede)
--                               carimba a conclusão anterior.
--
-- Nenhuma linha existente quebra: as duas colunas são nullable, sem default
-- que altere comportamento. Sem CHECK novo para a "trava de finalização" —
-- essa é regra de aplicação (ver abaixo), não invariante de linha.
-- ============================================================================

alter table public.pos_laudo_ciclos
  add column repercussao_laudo text
    check (repercussao_laudo in (
      'mantido_integralmente',        -- mantêm-se integralmente as conclusões do laudo
      'complementado_sem_alterar',    -- complementa a fundamentação, sem modificar a conclusão
      'retificacao_sem_repercussao',  -- retificação de erro material, sem repercussão sobre a conclusão
      'modificacao_parcial',          -- modificação parcial da fundamentação e/ou conclusão
      'revisao_substancial',          -- revisão substancial da conclusão pericial
      'substituicao_conclusao'        -- a conclusão anterior é substituída por nova (Complementação, seção IX)
    )),
  add column conclusao_vigente_nova text;

comment on column public.pos_laudo_ciclos.repercussao_laudo is
  'Síntese de nível de ciclo da repercussão sobre o laudo original (seção VI do modelo de Esclarecimentos / IX da Complementação). Preenchida pela perita; o sistema só sugere (aviso visual, modelo do rascunho_complementacao), nunca deriva. Só faz sentido no fluxo judicial. Os valores modificacao_parcial / revisao_substancial / substituicao_conclusao são os que exigem "Nova Conclusão Vigente" (trava de aplicação, não CHECK).';
comment on column public.pos_laudo_ciclos.conclusao_vigente_nova is
  'Rascunho da Nova Conclusão Vigente. Texto de trabalho no ciclo — só vira linha em pos_laudo_conclusoes_vigentes quando o documento de pós-laudo é protocolado. Nunca lido como conclusão vigente enquanto o documento não é protocolado.';
