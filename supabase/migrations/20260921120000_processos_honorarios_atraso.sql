-- ============================================================================
-- Central de Gestão de Prazos e Tarefas — atraso de pagamento de honorários.
-- Ver docs/plano-modulo-central-prazos.md, seção "Desenho proposto — dois
-- mecanismos, não um". Design aprovado pelo Jeferson em 15/09/2026, incluindo
-- o ajuste de nomear o campo judicial como PRÓXIMO marco (não só "marco"),
-- porque pode existir mais de um marco combinado ao longo do mesmo processo.
-- ============================================================================
-- Dois mecanismos DIFERENTES, nunca um campo genérico de vencimento forçando
-- os dois casos no mesmo molde (instrução explícita do Jeferson antes de
-- codar) — judicial e Assistência Técnica não têm o mesmo tipo de dado
-- disponível:
--
-- JUDICIAL — não existe vencimento calculável (quem determina como/quando/
-- quanto se paga é o juiz; nem sempre é 50/50, e a data de cada parcela
-- depende da determinação daquele processo específico). O que existe de
-- real é ELA sabendo, processo a processo, que combinou uma próxima data
-- com alguém (ex.: "metade ao iniciar, combinado pra 10/10"). Chamado
-- "PRÓXIMO marco" (não só "marco") de propósito: ao longo de um processo
-- pode existir mais de um marco em sequência (ex.: entrada, depois saldo na
-- entrega) — o campo guarda sempre o PRÓXIMO que falta, nunca um histórico
-- dos marcos já resolvidos. Preenchido e limpo por ela manualmente (nunca
-- calculado/inferido pelo sistema — não existe fórmula de "metade em X
-- dias"); ela pode preencher de novo se surgir um marco seguinte depois de
-- resolver o anterior. Mesmo par documentos_solicitados_em/descricao já
-- usado na fatia 3 (documentos pendentes) — data + descrição curta, nunca
-- um booleano.
--
-- ASSISTÊNCIA TÉCNICA — aqui SIM existe contrato fechado antes de começar,
-- com data e forma de pagamento conhecidas de antemão. Não precisa de um
-- campo "pago" novo: `situacao_financeira` já existente (Pago / Não pago /
-- Em parcelamento) segue sendo o sinal de resolvido, sem duplicar estado.
--
-- Lembrete na Central de Prazos (entra em código depois, não nesta
-- migration): fonte única com dois ramos — aparece quando
-- honorarios_vencimento está preenchido, honorarios_forma_pagamento é
-- 'boleto' ou 'transferência' (cartão/pix nunca geram lembrete, não
-- precisam de cobrança), e situacao_financeira <> 'Pago'. Prazo REAL
-- (nivelPorPrazo de verdade), diferente de "documentos pendentes"/
-- "liberação sem recebimento", que ficam em sem_prazo.
-- ============================================================================

alter table public.processos
  add column honorarios_proximo_marco_em date,
  add column honorarios_proximo_marco_descricao text,
  add column honorarios_forma_pagamento text,
  add column honorarios_vencimento date;

comment on column public.processos.honorarios_proximo_marco_em is
  'JUDICIAL só. Data do PRÓXIMO marco de pagamento combinado para este processo (ex.: "saldo na entrega do laudo, combinado pra 10/10") — nunca calculada pelo sistema, não existe fórmula de parcelamento. Sempre o PRÓXIMO que falta, não um histórico: ela limpa e preenche de novo se surgir um marco seguinte. Null = nenhum marco combinado no momento (normal, não é lacuna).';

comment on column public.processos.honorarios_proximo_marco_descricao is
  'Texto curto do que é o próximo marco (ex.: "saldo na entrega do laudo"). Preenchido junto com honorarios_proximo_marco_em — sem isso o lembrete não diz o que vence.';

comment on column public.processos.honorarios_forma_pagamento is
  'ASSISTÊNCIA TÉCNICA só. Catálogo fechado na UI (cartão / pix / boleto / transferência / outro) — texto livre sem CHECK no banco, mesmo padrão de situacao_financeira/situacao_processo (fechamento é convenção de UI, não constraint). Cartão e pix nunca geram lembrete de atraso.';

comment on column public.processos.honorarios_vencimento is
  'ASSISTÊNCIA TÉCNICA só. Data de vencimento do contrato, preenchida uma vez no cadastro/edição do processo — dado de contrato fixo, diferente do par judicial acima (que muda ao longo do trâmite).';
