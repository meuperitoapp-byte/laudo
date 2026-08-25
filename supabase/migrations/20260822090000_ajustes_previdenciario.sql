-- ============================================================================
-- Ajustes de schema motivados pelo mapeamento do modelo Previdenciário
-- ============================================================================
-- Decisão tomada com a Dra. Fernanda antes deste seed (ver conversa):
--
-- campos_secao.texto_automatico_template — na Seção XIII (Exame Físico por
-- Aparelhos e Sistemas), só o sistema 13.1 (Musculoesquelético) tem um
-- parágrafo de texto automático próprio combinando achados DAQUELE sistema
-- específico — granularidade de campo, não de seção inteira (diferente de
-- secoes.texto_automatico_template, que já existia desde o Curatela). Mesmo
-- padrão de placeholders {{codigo_do_campo}}, só que um nível mais fundo.
--
-- Não houve necessidade de migration para a "tabela de linhas dinâmicas"
-- (Seção VII.2 — Benefícios anteriores): isso é só uma convenção nova dentro
-- do jsonb já existente em campos_secao.config_tabela (chave
-- "linhas_dinamicas": true), sem alterar schema.
alter table public.campos_secao
  add column texto_automatico_template text;

comment on column public.campos_secao.texto_automatico_template is
  'Template de texto narrativo do campo (não da seção inteira) — usado quando um campo "guarda-chuva" (ex.: um sistema do exame físico) tem parágrafo próprio combinando achados dos seus sub-campos. Mesma sintaxe de placeholders de secoes.texto_automatico_template. Null na maioria dos campos.';
