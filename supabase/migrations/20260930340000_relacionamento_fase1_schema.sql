-- ============================================================================
-- Módulo de Relacionamento (CRM) — Fase 1: Institucional + Continuidade de
-- Serviços. Modelo: "PERICONS_MODULO_RELACIONAMENTO_DEFINITIVO_PARA_
-- PROGRAMADOR.pdf" (25 seções). Fase 1 = camadas 1 e 2 do documento;
-- Calendário Inteligente e Desfecho Judicial/Biblioteca de Decisões ficam
-- para fases seguintes (decisão do Jeferson, 28/09/2026).
--
-- Princípio central do modelo, mantido em todo o desenho: "o sistema calcula;
-- Patrícia acompanha, registra contatos e executa as ações; o CEO visualiza a
-- inteligência gerencial." Por isso ranking/categoria/faixa de relacionamento/
-- histórico comercial/histórico financeiro NÃO são colunas armazenadas —
-- são sempre calculados em código a partir de dados que já existem
-- (relacionamento_interacoes, processos ligados). Isso evita a Patrícia ter
-- que redigitar algo que o sistema já sabe, e evita os dois ficarem
-- dessincronizados.
--
-- A tela "/relacionamento" já existe hoje como placeholder
-- (PainelEmConstrucao) — este módulo substitui esse placeholder, não cria
-- rota nova. O item de menu e o bloqueio por perfil (módulo "relacionamento")
-- já existem desde a reorganização de navegação de 19-20/09/2026.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Hub — um registro por Advogado/Escritório, Cliente Saúde ou Profissional.
-- Nunca um periciando/parte do advogado entra aqui automaticamente (regra
-- explícita do modelo, §1) — só quem a Patrícia cadastra de propósito.
-- ----------------------------------------------------------------------------
create table public.relacionamentos (
  id                          uuid primary key default gen_random_uuid(),

  tipo                        text not null check (tipo in ('advogado_escritorio', 'cliente_saude', 'profissional')),
  nome                        text not null,
  observacoes                 text,

  -- Origem obrigatória no cadastro (§13 do modelo). Indicação exige indicador.
  origem                      text not null check (origem in (
                                'indicacao', 'redes_sociais', 'comercial_pericons', 'evento_palestra_curso',
                                'meu_perito', 'site_busca', 'cliente_antigo_retorno', 'parceria_institucional',
                                'acolher', 'outro'
                              )),
  indicado_por_id             uuid references public.relacionamentos(id),

  -- Relacionamento (último canal + próxima ação manuais; primeiro/último
  -- contato e faixa de tempo sem contato são CALCULADOS a partir de
  -- relacionamento_interacoes, nunca armazenados aqui).
  ultimo_canal                text check (ultimo_canal in ('whatsapp', 'telefone', 'email', 'reuniao', 'presencial', 'outro')),
  proxima_acao_texto          text,
  proxima_acao_motivo         text,
  proxima_acao_data           date,

  -- §12 — MEU PERITO: flag global que acompanha o registro em toda tela
  -- (cadastro, caso, orçamento, campanha, follow-up). Só faz sentido pra
  -- advogado_escritorio, mas fica na tabela-mãe por ser a flag que atravessa
  -- tudo, inclusive telas que não sabem o tipo do relacionamento.
  meu_perito                  boolean not null default false,
  meu_perito_status           text check (meu_perito_status in ('nao_abordado', 'abordado', 'em_avaliacao', 'assinante', 'inativo')),
  meu_perito_potencial        text check (meu_perito_potencial in ('baixo', 'medio', 'alto')),
  meu_perito_observacao       text,

  -- Só tipo = cliente_saude (§11).
  cs_tipo_demanda              text check (cs_tipo_demanda in (
                                'medicamento', 'cirurgia', 'plano_saude', 'home_care', 'internacao_leito',
                                'erro_medico', 'tratamento', 'beneficio_direito_doenca', 'indenizacao', 'outra'
                              )),
  cs_necessidade               text check (cs_necessidade in ('juridica', 'medico_pericial', 'extrajudicial', 'ambas', 'em_avaliacao')),
  cs_status                    text check (cs_status in ('entrada', 'triagem', 'qualificada', 'direcionada', 'em_acompanhamento', 'encerrada')) default 'entrada',

  -- Só tipo = profissional (§12 do modelo, distinto do MEU PERITO acima).
  prof_profissao               text check (prof_profissao in ('medico', 'dentista', 'psicologo', 'outro')),
  prof_profissao_outra          text,
  prof_conselho_registro        text,
  prof_especialidade            text,
  prof_cidade                   text,
  prof_uf                        text,
  prof_necessidade               text check (prof_necessidade in (
                                'juridica', 'etico_profissional', 'consultoria', 'pericial',
                                'gestao_regularizacao', 'formacao', 'outro'
                              )),

  created_by                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.relacionamentos is
  'Hub do Módulo de Relacionamento (CRM) — Advogado/Escritório, Cliente Saúde ou Profissional. Periciandos nunca entram aqui automaticamente.';
comment on column public.relacionamentos.indicado_por_id is
  'Obrigatório na aplicação quando origem = indicacao. Sem CHECK cruzado no banco (Postgres não valida CHECK entre 2 colunas de tabelas diferentes de forma simples aqui) — validado em actions.ts.';

alter table public.relacionamentos enable row level security;
create policy "relacionamentos_full_access" on public.relacionamentos
  for all to authenticated using (true) with check (true);

create index relacionamentos_tipo_idx on public.relacionamentos(tipo);
create index relacionamentos_indicado_por_idx on public.relacionamentos(indicado_por_id);

-- ----------------------------------------------------------------------------
-- 2) Advogados vinculados a um escritório (só tipo = advogado_escritorio).
-- Ranking/financeiro ficam consolidados no escritório (relacionamentos.id) —
-- esta tabela é só a lista de nomes/contatos individuais + aniversário
-- individual (marco de relacionamento, §12).
-- ----------------------------------------------------------------------------
create table public.relacionamento_advogados (
  id                  uuid primary key default gen_random_uuid(),
  relacionamento_id   uuid not null references public.relacionamentos(id) on delete cascade,
  nome                text not null,
  oab                 text,
  email               text,
  telefone            text,
  data_nascimento     date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.relacionamento_advogados enable row level security;
create policy "relacionamento_advogados_full_access" on public.relacionamento_advogados
  for all to authenticated using (true) with check (true);
create index relacionamento_advogados_relacionamento_id_idx on public.relacionamento_advogados(relacionamento_id);

-- ----------------------------------------------------------------------------
-- 3) Histórico de contatos — toda interação registrada aqui atualiza
-- "último contato" e recalcula a faixa (verde/amarelo/laranja/vermelho)
-- automaticamente, por construção (é sempre MAX(data) desta tabela).
-- `campanha` marca quando o contato foi motivado por uma campanha automática
-- (§13-14 do modelo) — não é obrigatório.
-- Regra do projeto (pedido dela, 26/09/2026): data NUNCA tem default "hoje"
-- no formulário — por isso a coluna também não tem default aqui.
-- ----------------------------------------------------------------------------
create table public.relacionamento_interacoes (
  id                  uuid primary key default gen_random_uuid(),
  relacionamento_id   uuid not null references public.relacionamentos(id) on delete cascade,
  data                date not null,
  canal               text not null check (canal in ('whatsapp', 'telefone', 'email', 'reuniao', 'presencial', 'outro')),
  observacao          text,
  campanha            text,
  responsavel         text,
  created_at          timestamptz not null default now()
);
alter table public.relacionamento_interacoes enable row level security;
create policy "relacionamento_interacoes_full_access" on public.relacionamento_interacoes
  for all to authenticated using (true) with check (true);
create index relacionamento_interacoes_relacionamento_id_idx on public.relacionamento_interacoes(relacionamento_id, data desc);

-- ----------------------------------------------------------------------------
-- 4) Configuração do módulo (linha única) — hoje só o valor padrão do
-- crédito de indicação, "configurável pela gestão" por exigência explícita
-- do modelo (§13: "não fixo no código").
-- ----------------------------------------------------------------------------
create table public.relacionamento_configuracoes (
  id                                  boolean primary key default true check (id),
  valor_credito_indicacao_padrao      numeric(14,2) not null default 0,
  updated_at                          timestamptz not null default now()
);
comment on table public.relacionamento_configuracoes is
  'Linha única (id sempre true) — configurações do módulo editáveis pela gestão sem alteração de código.';
insert into public.relacionamento_configuracoes (id) values (true);
alter table public.relacionamento_configuracoes enable row level security;
create policy "relacionamento_configuracoes_full_access" on public.relacionamento_configuracoes
  for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 5) Extrato de créditos de indicação (§13 — "sistema mantém extrato
-- completo"). Saldo = soma('gerado') - soma('utilizado'), calculado em
-- código, nunca armazenado.
-- ----------------------------------------------------------------------------
create table public.relacionamento_creditos_indicacao (
  id                   uuid primary key default gen_random_uuid(),
  indicador_id         uuid not null references public.relacionamentos(id) on delete cascade,
  tipo                 text not null check (tipo in ('gerado', 'utilizado')),
  valor                numeric(14,2) not null,
  data                 date not null,
  servico_relacionado  text,
  processo_id          uuid references public.processos(id) on delete set null,
  observacao           text,
  created_at           timestamptz not null default now()
);
alter table public.relacionamento_creditos_indicacao enable row level security;
create policy "relacionamento_creditos_indicacao_full_access" on public.relacionamento_creditos_indicacao
  for all to authenticated using (true) with check (true);
create index relacionamento_creditos_indicacao_indicador_id_idx on public.relacionamento_creditos_indicacao(indicador_id);

-- ----------------------------------------------------------------------------
-- 6) Premiações (§12 — histórico permanente por registro).
-- ----------------------------------------------------------------------------
create table public.relacionamento_premiacoes (
  id                uuid primary key default gen_random_uuid(),
  relacionamento_id uuid not null references public.relacionamentos(id) on delete cascade,
  campanha          text,
  premiacao         text not null,
  status            text not null default 'a_enviar' check (status in ('a_enviar', 'enviado', 'entregue')),
  data_prevista     date,
  data_enviada      date,
  observacao        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.relacionamento_premiacoes enable row level security;
create policy "relacionamento_premiacoes_full_access" on public.relacionamento_premiacoes
  for all to authenticated using (true) with check (true);
create index relacionamento_premiacoes_relacionamento_id_idx on public.relacionamento_premiacoes(relacionamento_id);

-- ----------------------------------------------------------------------------
-- 7) Conexões/encaminhamentos (§14-15 — Rede Parceira). `destino_descricao`
-- cobre o caso de destino não ser um relacionamento cadastrado (ex.: "Produto
-- PERICONS"). Ranking financeiro NÃO é critério isolado de encaminhamento —
-- por isso não existe cálculo automático de destino aqui, é sempre uma
-- escolha manual da Patrícia (função "localizar escritório parceiro" na UI).
-- ----------------------------------------------------------------------------
create table public.relacionamento_encaminhamentos (
  id                        uuid primary key default gen_random_uuid(),
  origem_id                 uuid not null references public.relacionamentos(id) on delete cascade,
  destino_id                uuid references public.relacionamentos(id) on delete set null,
  destino_descricao         text,
  demanda                   text,
  data                      date not null,
  status                    text not null default 'encaminhado' check (status in ('encaminhado', 'aceito', 'recusado', 'em_contato', 'encerrado')),
  contratacao_realizada     text not null default 'nao_informado' check (contratacao_realizada in ('sim', 'nao', 'nao_informado')),
  retorno_cliente           text,
  retorno_escritorio        text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
alter table public.relacionamento_encaminhamentos enable row level security;
create policy "relacionamento_encaminhamentos_full_access" on public.relacionamento_encaminhamentos
  for all to authenticated using (true) with check (true);
create index relacionamento_encaminhamentos_origem_id_idx on public.relacionamento_encaminhamentos(origem_id);
create index relacionamento_encaminhamentos_destino_id_idx on public.relacionamento_encaminhamentos(destino_id);

-- ----------------------------------------------------------------------------
-- 8) Regras de continuidade — configurável pela gestão (§20.4: "editável
-- pela gestão sem alteração de código"). `servico_origem` é catálogo editável
-- (texto livre + sugestões), igual a situacao_processo/categoria em outros
-- módulos — não é uma lista fechada, porque a lista de "serviços" da
-- PERICONS já muda com frequência (etapas_contratadas cresceu várias vezes).
-- ----------------------------------------------------------------------------
create table public.continuidade_regras (
  id                          uuid primary key default gen_random_uuid(),
  servico_origem              text not null,
  gatilho                     text,
  servico_destino_principal   text,
  servicos_alternativos       text[] not null default '{}',
  prazo_dias_padrao           integer not null default 7,
  ativo                       boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
alter table public.continuidade_regras enable row level security;
create policy "continuidade_regras_full_access" on public.continuidade_regras
  for all to authenticated using (true) with check (true);

-- Semente inicial a partir das réguas descritas no modelo (§20.4) — a gestão
-- pode editar/desativar/adicionar livremente pela tela, isso é só o ponto de
-- partida.
insert into public.continuidade_regras (servico_origem, gatilho, servico_destino_principal, servicos_alternativos, prazo_dias_padrao) values
  ('Análise de Viabilidade', 'Resultado positivo', 'Assistência Técnica / Estratégia Pericial', '{}', 7),
  ('Análise de Viabilidade', 'Positiva sem continuidade contratada', 'Serviço avulso', '{"Quesitos","Parecer técnico","Acompanhamento ao ato pericial","Manifestação/impugnação","Consulta com especialista"}', 7),
  ('Quesitos', 'Perícia designada', 'Acompanhamento ao ato pericial', '{}', 7),
  ('Acompanhamento ao ato pericial', 'Aguardar laudo', 'Monitorar juntada do laudo', '{}', 30),
  ('Laudo disponibilizado', 'Novo marco processual', 'Análise do laudo', '{}', 7),
  ('Análise do laudo', 'Necessidade técnica identificada', 'Manifestação/impugnação', '{}', 7),
  ('Assistência Técnica — Fase 1', 'Perícia designada', 'Assistência Técnica — Fase 2 / Acompanhamento', '{}', 7),
  ('Assistência Técnica — Fase 2', 'Laudo juntado', 'Análise do laudo / Manifestação', '{}', 7),
  ('Parecer Técnico', 'Nova etapa identificada', 'Serviço aplicável', '{}', 7);

-- ----------------------------------------------------------------------------
-- 9) Oportunidades de continuidade — a fila de trabalho do §20.7. Toda
-- oportunidade nasce de um registro manual (a perita/Patrícia decide, o
-- sistema não dispara sozinho — mesmo princípio de "sistema não decide" já
-- usado em nexo causal), mas o prazo/nível de urgência e a listagem na
-- Central de Prazos são automáticos a partir daqui.
-- `resultado_followup` são os 10 valores padronizados do §20.5.
-- ----------------------------------------------------------------------------
create table public.continuidade_oportunidades (
  id                    uuid primary key default gen_random_uuid(),
  processo_id           uuid not null references public.processos(id) on delete cascade,
  relacionamento_id     uuid references public.relacionamentos(id) on delete set null,

  servico_origem        text not null,
  gatilho               text,
  data_gatilho          date not null,
  prazo_dias            integer not null default 7,
  data_limite           date not null,

  -- §20.1 — fluxo do cliente, identificado antes de qualquer orçamento/follow-up.
  fluxo                 text check (fluxo in ('avulso', 'meu_perito', 'cliente_saude_direto')),

  status                text not null default 'aberta' check (status in (
                          'aberta', 'contratou_principal', 'contratou_avulso',
                          'encerrada_sem_continuidade', 'aguardando_marco'
                        )),
  resultado_followup    text check (resultado_followup in (
                          'contratou_principal', 'contratou_avulso', 'ainda_avaliando', 'sem_interesse',
                          'valor_elevado', 'fara_internamente', 'caso_nao_prosseguiu',
                          'sem_necessidade_agora', 'aguardando_marco_processual', 'sem_resposta', 'outro'
                        )),
  resultado_followup_outro  text,
  proxima_tentativa_data    date,
  observacao                text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.continuidade_oportunidades is
  'Fila de "Continuidade de Serviços" (§20 do modelo de Relacionamento) — toda oportunidade aberta aparece na Central de Prazos (fonte 22).';
alter table public.continuidade_oportunidades enable row level security;
create policy "continuidade_oportunidades_full_access" on public.continuidade_oportunidades
  for all to authenticated using (true) with check (true);
create index continuidade_oportunidades_processo_id_idx on public.continuidade_oportunidades(processo_id);
create index continuidade_oportunidades_status_idx on public.continuidade_oportunidades(status) where status = 'aberta';

-- ----------------------------------------------------------------------------
-- 10) Link opcional processo -> relacionamento. Fica nulo pros processos já
-- existentes (não há como reconstruir esse vínculo automaticamente sem
-- arriscar casamento errado por nome parecido) — passa a ser preenchido pra
-- processos novos, e pode ser vinculado manualmente num processo antigo a
-- qualquer momento. É a partir daqui que histórico comercial/financeiro do
-- relacionamento é calculado automaticamente (nunca redigitado).
-- ----------------------------------------------------------------------------
alter table public.processos add column relacionamento_id uuid references public.relacionamentos(id) on delete set null;
create index processos_relacionamento_id_idx on public.processos(relacionamento_id);
comment on column public.processos.relacionamento_id is
  'Vínculo opcional com o Módulo de Relacionamento — alimenta histórico comercial/financeiro/ranking do escritório automaticamente. Nulo em processos anteriores a 30/09/2026 (sem backfill automático).';
