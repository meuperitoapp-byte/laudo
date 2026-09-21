-- ============================================================================
-- Processos — data da contratação + prazo contratual de entrega (AT)
-- ============================================================================
-- Pedido dela (21/09/2026, com print circulando o card de Identificação do
-- processo): esses dois campos precisam ficar na tela de identificação do
-- processo — onde a secretária mexe — em vez de dentro da Análise de
-- Viabilidade. "Prazo contratual de entrega" já existia como campo da
-- Viabilidade (§3 do spec); migra pra cá e o campo antigo é removido, sem
-- duplicar a mesma informação em dois lugares.

alter table public.processos
  add column data_contratacao date,
  add column prazo_contratual_entrega date;

comment on column public.processos.data_contratacao is
  'Data em que o serviço foi contratado — visível no card de Identificação do processo (secretária). Aplicável sobretudo a Assistência Técnica.';
comment on column public.processos.prazo_contratual_entrega is
  'Prazo contratual de entrega combinado com o cliente/advogado — mesmo campo que antes vivia em analises_viabilidade.prazo_contratual_entrega (removido nesta migration).';

alter table public.analises_viabilidade
  drop column prazo_contratual_entrega;
