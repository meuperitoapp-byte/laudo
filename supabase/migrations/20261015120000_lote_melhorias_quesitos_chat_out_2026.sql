-- ============================================================================
-- Lote de melhorias de 15/10/2026 (pedidos da Dra. Fernanda, repassados pelo
-- Jeferson) — 8 itens, um bloco por item abaixo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) "Concluir" itens automáticos da Central de Prazos
-- ----------------------------------------------------------------------------
-- Relato dela: a demanda "Elaborar/enviar orçamento" ficava eternamente em
-- "O que cumprir" (o orçamento foi enviado, a cliente não aprovou), sem
-- nenhum botão pra tirar da tela. Os itens automáticos são CALCULADOS a
-- partir de outras tabelas (ver central-prazos/agregador.ts) — não existe
-- linha própria pra marcar como feita. Esta tabela guarda a decisão "já
-- cumpri isso" por item, com uma ASSINATURA (categoria + título + prazo):
-- se a origem mudar depois (nova próxima ação, novo prazo), a assinatura
-- muda e o item volta a aparecer — nunca some pra sempre por engano.
create table public.central_itens_concluidos (
  item_id             text primary key,
  assinatura          text not null,
  motivo              text,
  concluido_por_nome  text,
  concluido_em        timestamptz not null default now()
);

comment on table public.central_itens_concluidos is
  'Itens AUTOMÁTICOS da Central de Prazos que a equipe marcou como cumpridos/dispensados. item_id = ItemPainel.id; assinatura = categoria|título|prazo no momento da conclusão (se a origem mudar, o item reaparece).';

alter table public.central_itens_concluidos enable row level security;
create policy "central_itens_concluidos_full_access" on public.central_itens_concluidos
  for all to authenticated using (true) with check (true);


-- ----------------------------------------------------------------------------
-- 2) Horário da reunião de Estratégia pericial
-- ----------------------------------------------------------------------------
-- Antes só tinha data — pra ter horário ela precisava criar outro
-- agendamento na Agenda (duplicado). Opcional: reuniões já marcadas
-- continuam válidas sem horário.
alter table public.processos
  add column estrategia_pericial_reuniao_hora time;

comment on column public.processos.estrategia_pericial_reuniao_hora is
  'Horário da reunião de Estratégia pericial (opcional) — aparece no card, no selo das etapas contratadas e na Agenda.';


-- ----------------------------------------------------------------------------
-- 3) Anexo nos documentos/provas complementares da Estratégia Pericial
-- ----------------------------------------------------------------------------
-- Mesmo padrão de documentos.etapa_at / necessidade_especialista_id:
-- reaproveita o pipeline de Documentos (mesmo bucket, mesmo upload), só
-- marca a qual item da Estratégia o arquivo pertence. Anexo é opcional.
alter table public.documentos
  add column estrategia_documento_prova_id uuid
    references public.estrategia_documentos_provas(id) on delete set null;

create index idx_documentos_estrategia_documento_prova
  on public.documentos (estrategia_documento_prova_id)
  where estrategia_documento_prova_id is not null;

comment on column public.documentos.estrategia_documento_prova_id is
  'Vínculo opcional com um item de estrategia_documentos_provas — o arquivo também aparece na lista geral de Documentos do processo.';


-- ----------------------------------------------------------------------------
-- 5/6/7) Quesitos (documento ao Juízo) — dados de abertura, novo layout,
--        registro de entrega
-- ----------------------------------------------------------------------------
-- Novo layout aprovado por ela (modelo feito no Canva, 15/10/2026):
-- endereçamento → Processo nº → parágrafo de apresentação do AT (sem título)
-- → I- Breve contextualização → II- Quesitos (opcionalmente agrupados por
-- tema, com subitens a/b/c) → fechamento → data → assinatura.
alter table public.quesitos_documentos
  add column apresentacao_at       text,
  add column resumo_fatos          text,
  add column introducao_quesitos   text,
  add column data_contratacao      date,
  add column prazo_entrega         date,
  add column entregue_em           date,
  add column entregue_via          text check (entregue_via in ('whatsapp', 'email', 'sistema'));

comment on column public.quesitos_documentos.apresentacao_at is
  'Parágrafo de apresentação do Assistente Técnico (sem título no documento). Vazio = texto padrão montado na geração.';
comment on column public.quesitos_documentos.resumo_fatos is
  'Breve resumo dos fatos / contextualização técnico-pericial — seção I do documento. Substitui sintese_tese + o_que_demonstrar_pericia na tela.';
comment on column public.quesitos_documentos.introducao_quesitos is
  'Frase opcional antes do 1º quesito (ex.: "Queira o(a) Ilmo(a) Perito(a) esclarecer ao Juízo:").';
comment on column public.quesitos_documentos.prazo_entrega is
  'Prazo de entrega dos quesitos — alimenta a Central de Prazos enquanto entregue_em estiver vazio.';
comment on column public.quesitos_documentos.entregue_via is
  'Meio de entrega registrado junto com entregue_em: whatsapp | email | sistema.';

-- Os dois campos antigos de contexto viram um só (resumo_fatos) — junta o
-- que já tinha sido digitado, pra nada se perder.
update public.quesitos_documentos
   set resumo_fatos = nullif(concat_ws(E'\n\n', nullif(trim(sintese_tese), ''), nullif(trim(o_que_demonstrar_pericia), '')), '')
 where resumo_fatos is null
   and (sintese_tese is not null or o_que_demonstrar_pericia is not null);

-- Correção de dado (caso Felipe Chagas Quintela Souza): o endereçamento foi
-- digitado no campo de pontos controvertidos e vice-versa — era isso que
-- fazia o PDF sair "com a ordem trocada". O campo de pontos controvertidos
-- sai da tela no layout novo.
update public.quesitos_documentos
   set endereco_juizo = pontos_controvertidos,
       pontos_controvertidos = endereco_juizo
 where id = '6917be9b-ac96-4f1a-a71c-88728032ca13'
   and pontos_controvertidos ilike 'AO DOUTO JU%';

-- Agrupamento opcional dos quesitos por tema ("A) Sobre a Associação
-- Hospitalar de Mondai:") — quesitos seguidos com o mesmo grupo saem sob o
-- mesmo título. Numeração continua corrida entre grupos.
alter table public.quesitos
  add column grupo text;

comment on column public.quesitos.grupo is
  'Tema/grupo opcional do quesito (documento de Quesitos da AT). Quesitos consecutivos com o mesmo grupo saem sob um título "A) <grupo>".';


-- ----------------------------------------------------------------------------
-- 5/7) Réplica — mesmos dados de abertura e registro de entrega dos Quesitos
-- ----------------------------------------------------------------------------
alter table public.replicas
  add column data_contratacao  date,
  add column prazo_entrega     date,
  add column entregue_em       date,
  add column entregue_via      text check (entregue_via in ('whatsapp', 'email', 'sistema'));

comment on column public.replicas.prazo_entrega is
  'Prazo de entrega da Orientação para Réplica — alimenta a Central de Prazos enquanto entregue_em estiver vazio.';


-- ----------------------------------------------------------------------------
-- 8) Aviso de mensagens novas no Chat
-- ----------------------------------------------------------------------------
-- Antes: um pontinho de 2px no menu, guardado só no navegador (trocar de
-- computador/limpar dados = perdia) e contando até as mensagens que a
-- própria pessoa enviou. Agora a última leitura fica no banco, por pessoa.
create table public.chat_leituras (
  usuario_email  text primary key,
  lido_em        timestamptz not null default now()
);

comment on table public.chat_leituras is
  'Última vez que cada pessoa abriu o Chat — base do contador de mensagens não lidas no menu.';

alter table public.chat_leituras enable row level security;
create policy "chat_leituras_full_access" on public.chat_leituras
  for all to authenticated using (true) with check (true);


-- ----------------------------------------------------------------------------
-- Rodapé dos documentos de Assistência Técnica
-- ----------------------------------------------------------------------------
-- Estava vazio (o PDF de Quesitos saía só com o ícone). Texto do modelo que
-- ela aprovou — continua editável em Configurações. Só preenche se vazio.
update public.configuracoes
   set rodape_at_texto = E'Assistência Técnica Médica e Consultoria em Saúde\n(85) 99723-1920 | pericias.pericons@gmail.com'
 where id = true
   and (rodape_at_texto is null or trim(rodape_at_texto) = '');


-- ----------------------------------------------------------------------------
-- Sino de notificações
-- ----------------------------------------------------------------------------
insert into public.atualizacoes_sistema (titulo, descricao) values
  ('Concluir demandas em "O que cumprir"',
   'Demandas automáticas (como "Elaborar/enviar orçamento") agora têm o botão Concluir, com campo opcional para anotar o motivo (ex.: orçamento não aprovado).'),
  ('Horário na reunião de Estratégia pericial',
   'A reunião agora aceita horário, que aparece no card, nas etapas contratadas e na Agenda — sem precisar criar outro agendamento.'),
  ('Anexo nos documentos e provas da Estratégia',
   'Cada documento/prova complementar da Estratégia Pericial pode receber um arquivo anexo (opcional).'),
  ('Quesitos: novo modelo de documento',
   'Quesitos ganharam card próprio na sequência das etapas, dados de abertura (anexo, nº do processo, contratação e prazo), apresentação do AT, resumo dos fatos, grupos de quesitos, registro de entrega e o documento no novo layout.'),
  ('Aviso de mensagens novas no Chat',
   'O menu Chat agora mostra quantas mensagens novas você tem, e um aviso aparece em qualquer tela quando chega mensagem.');
