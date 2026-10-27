-- ============================================================================
-- Lote de melhorias de 27/10/2026 (pedidos da Dra. Fernanda): esteira da
-- Análise de Viabilidade e Chat ligado ao caso.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Data/horário da reunião de apresentação do resultado da Viabilidade
-- ----------------------------------------------------------------------------
-- A Patrícia agenda a reunião (pos_entrega_reuniao = 'agendar') e informa a
-- data aqui; a reunião então entra na Agenda da Dra. Fernanda.
alter table public.analises_viabilidade
  add column pos_entrega_reuniao_em   date,
  add column pos_entrega_reuniao_hora time;

comment on column public.analises_viabilidade.pos_entrega_reuniao_em is
  'Data da reunião de apresentação do resultado, informada ao agendar — alimenta a Agenda da Dra. Fernanda.';


-- ----------------------------------------------------------------------------
-- 2) Chat ligado ao caso + "falta responder"
-- ----------------------------------------------------------------------------
-- processo_id: a mensagem fica salva também dentro do caso.
-- "Falta responder": mensagem direcionada (mencionado_nome) fica pendente
-- pra essa pessoa até ela responder (nova mensagem dela) ou marcar como
-- respondida — respondida_em guarda o "marcar como respondida".
alter table public.chat_mensagens
  add column processo_id    uuid references public.processos(id) on delete set null,
  add column respondida_em  timestamptz;

create index idx_chat_mensagens_processo
  on public.chat_mensagens (processo_id, created_at)
  where processo_id is not null;

comment on column public.chat_mensagens.processo_id is
  'Caso ao qual a conversa pertence (opcional) — a mensagem também aparece na tela do processo.';
comment on column public.chat_mensagens.respondida_em is
  'Quando a pessoa direcionada marcou a mensagem como respondida (limpa o "falta responder").';


-- ----------------------------------------------------------------------------
-- Sino de notificações
-- ----------------------------------------------------------------------------
insert into public.atualizacoes_sistema (titulo, descricao) values
  ('Esteira da Análise de Viabilidade',
   'A próxima ação direcionada aparece nas atividades de quem foi marcado; a reunião de apresentação agendada entra na Agenda da Dra. Fernanda; a Continuidade de Serviços só aparece depois que a análise é concluída como viável.'),
  ('Minhas atividades',
   'Em "O que fazer hoje" você vê só o que é seu, com o botão "Ver tudo".'),
  ('Chat por caso e "falta responder"',
   'Mensagens podem ser ligadas a um caso e ficam salvas nele; mensagens que exigem resposta ficam sinalizadas até serem respondidas.');
