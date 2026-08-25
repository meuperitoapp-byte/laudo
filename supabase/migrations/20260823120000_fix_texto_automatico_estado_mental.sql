-- ============================================================================
-- Correção de conteúdo: texto_automatico_template da Seção X (Curatela —
-- Exame do Estado Mental) referenciava placeholders sem campo correspondente
-- ============================================================================
-- Achado ao testar o preenchimento por seção (Etapa 4): o template usava
-- {{orientacao}}, {{memoria}}, {{pensamento}} e {{funcoes_executivas}}, mas
-- campos_secao só tem os sub-itens (orientacao_temporal, memoria_imediata,
-- pensamento_curso, funcao_executiva_planejamento etc. — reparar até o
-- prefixo "funcao_executiva" vs. "funcoes_executivas" do template estava
-- errado). Resultado: esses 4 trechos nunca eram substituídos no texto
-- narrativo gerado, ficavam com o placeholder cru.
--
-- Esta migration corrige a LINHA JÁ SEEDADA no banco (supabase/seed/curatela.sql
-- também foi corrigido, pra quem rodar o seed do zero a partir de agora já sair certo).
-- ============================================================================

update public.secoes
set texto_automatico_template = 'Ao exame do estado mental, o(a) periciando(a) apresentou-se {{consciencia}}, com orientação autopsíquica {{orientacao_autopsiquica}}, temporal {{orientacao_temporal}}, espacial {{orientacao_espacial}} e situacional {{orientacao_situacional}}, atenção e concentração {{atencao_concentracao}}, memória imediata {{memoria_imediata}}, recente {{memoria_recente}} e remota {{memoria_remota}}, linguagem {{linguagem}} e pensamento com curso {{pensamento_curso}}, forma {{pensamento_forma}} e conteúdo {{pensamento_conteudo}}. O juízo crítico mostrou-se {{juizo_critico}}, o insight {{insight}}, observando-se funções executivas — planejamento {{funcao_executiva_planejamento}}, organização {{funcao_executiva_organizacao}}, resolução de problemas {{funcao_executiva_resolucao_problemas}} e flexibilidade cognitiva {{funcao_executiva_flexibilidade_cognitiva}} — e capacidade de abstração {{capacidade_abstracao}}.'
where id = '2c2d3d72-c0c3-5846-9f38-37978db3e408'
  and codigo = 'exame_estado_mental';
