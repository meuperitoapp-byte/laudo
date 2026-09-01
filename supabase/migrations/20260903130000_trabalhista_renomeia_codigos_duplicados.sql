-- ============================================================================
-- Renomeia códigos de campo duplicados no Trabalhista — revisão do catálogo,
-- item 3.
-- ============================================================================
-- `campos_secao.codigo` deve ser único DENTRO de um tipo_laudo (é a chave que
-- narrativo.ts / compilar.ts usam para montar contexto de placeholder e
-- resolver `condicao`). O seed do Trabalhista tinha 2 pares colididos:
--
--   conclusao_nexo  -> XX  Matriz de Análise do Nexo Causal   ("Conclusão sobre nexo")
--   conclusao_nexo  -> XXXII Conclusão Médico-Pericial         ("Nexo")
--   observacoes     -> XI  Condições e Organização do Trabalho ("Observações")
--   observacoes     -> XIV Observação Pericial Espontânea      ("Observações")
--
-- Nenhuma `condicao` nem nenhum {{placeholder}} existente referenciava esses
-- códigos (confirmado antes e depois da mudança pelo validador), então o
-- renome é seguro. `unique (secao_id, codigo)` no schema já permitia a
-- coexistência; o problema é só a colisão no mapa por-código em runtime.
-- ============================================================================

update public.campos_secao set codigo = 'conclusao_nexo_matriz' where id = '3bded5b1-dccd-5949-8ac8-eaa595ac0c3e';  -- era 'conclusao_nexo'
update public.campos_secao set codigo = 'conclusao_nexo_sintese' where id = '02df4aba-cf67-5d66-a48f-e85391a6235e';  -- era 'conclusao_nexo'
update public.campos_secao set codigo = 'observacoes_condicoes_trabalho' where id = '6c6bc59d-e5ef-5925-8790-35a0be5a4968';  -- era 'observacoes'
update public.campos_secao set codigo = 'observacoes_observacao_espontanea' where id = '2e08784b-066a-5eed-b16d-f7aaa41503aa';  -- era 'observacoes'
