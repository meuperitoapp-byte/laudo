-- ============================================================================
-- Análise de Viabilidade — observação/instrução livre na Próxima ação
-- ============================================================================
-- Pedido dela (30/09/2026): "tem como colocar uma janela para eu editar
-- alguma informação sobre o comando? ex: se selecionei sobre enviar o
-- orçamento eu já descrevo pra ela qual seriam os próximos serviços ou se o
-- cliente é carente e será parceria...etc" — recado livre da perita pra
-- Patrícia/financeiro sobre a próxima ação marcada, exibido na tela separada
-- de Pós-entrega (não é dado clínico/jurídico da análise, é instrução
-- operacional — por isso pode ser visto por quem só tem acesso ao essencial
-- do caso).
alter table public.analises_viabilidade
  add column proxima_acao_observacao text;

comment on column public.analises_viabilidade.proxima_acao_observacao is
  'Recado livre da perita sobre a próxima ação marcada (ex.: próximos serviços, se é caso de parceria) — visível pra quem só tem acesso à tela de Pós-entrega.';
