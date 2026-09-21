-- ============================================================================
-- Janela de Análise de Viabilidade Técnico-Pericial — schema completo
-- ============================================================================
-- Módulo aprovado pra pagar pela Dra. Fernanda (19/09/2026). Spec completa
-- (45 seções) capturada em analise-viabilidade-spec (memória do projeto).
-- Decisão do Jeferson (21/09/2026): construir o schema inteiro nesta única
-- migration (não fatiar migration por fatia de feature) — mesmo precedente
-- de 20260905120000_pos_laudo_schema.sql. As fatias de UI/Server Actions
-- vêm depois, todas contra este schema já pronto, sem migration nova no
-- meio do caminho.
--
-- DECISÃO ESTRUTURAL CENTRAL: tudo fica ligado a `processo_id` (o CASO),
-- nunca a um id interno da análise de viabilidade — é o que permite um
-- módulo futuro (Estratégia Pericial etc., nenhum construído ainda) ler as
-- MESMAS linhas em vez de duplicar dado. Reaproveita `processos` como o
-- CASO sem alterar nenhuma coluna dele: `tipo_trabalho = 'assistencia_
-- tecnica'` + `etapas_contratadas` incluindo 'analise_viabilidade' (já é
-- vocabulário existente, ver EtapaContratada em src/types/enums.ts) cobre
-- 100% da premissa "pré-processual, sem processo/vara/comarca obrigatório"
-- sem precisar de uma entidade CASO nova. Se o caso for ajuizado depois, é
-- a MESMA linha de processos recebendo numero_processo/vara/comarca numa
-- edição normal — nunca cria caso novo.
--
-- VERSIONAMENTO (decisão do Jeferson, 21/09/2026): não resolver histórico
-- completo agora — só deixar a porta aberta. TODA tabela `caso_*` (e o hub
-- `analises_viabilidade`) ganha `origem_modulo` (quem criou a linha) e
-- `atualizado_por_modulo` (quem alterou por último). CHECK com 'viabilidade'
-- como único valor possível por enquanto — quando Estratégia Pericial
-- existir, o CHECK ganha o novo valor numa migration pequena, e a decisão
-- de versionar de verdade (nunca sobrescrever silenciosamente, por causa do
-- que o spec pede em Estratégia/Contestação) fica fácil de tomar em cima de
-- um dado que já carrega proveniência. Sem isso, seria retrofit em ~17
-- tabelas no dia em que Estratégia for construída.
--
-- GARANTIA ESTRUTURAL dos campos internos (nunca aparecem no PDF externo):
-- risco pericial e raciocínio pericial interno (seções 23 e 25 do spec)
-- moram no hub `analises_viabilidade` junto com os campos públicos — a
-- garantia de que eles nunca vazam pro PDF NÃO é uma coluna/flag aqui, é a
-- assinatura de tipos da função geradora do PDF (fatia 8, código), que só
-- aceita os campos da whitelist do §44. `caso_tese_adversa` também é
-- inteiramente interna pela mesma razão.
--
-- VOCABULÁRIO FECHADO (CHECK) vs. CATÁLOGO EDITÁVEL (texto livre, sem
-- CHECK): os campos com lista de opções EXPLÍCITA e pequena no spec
-- (Relevância, Impacto, Avaliação, Segurança, Plausibilidade, Força,
-- Conclusão do nexo etc.) usam CHECK — são taxonomias clínico-periciais
-- fechadas, não algo que cresce com o uso. Os 4 campos que a Dra. Fernanda
-- decidiu tratar como catálogo editável (posição do cliente, especialidade,
-- matéria, e por extensão recomendação técnica/responsável da próxima
-- ação) ficam como texto livre, mesmo padrão de situacao_processo/
-- orgao_classe — fechamento é convenção de UI (ComboboxCatalogo), não
-- constraint. Campos de "prioridade" que o spec cita sem listar opções
-- também ficam texto livre pelo mesmo motivo (nada fechado no spec pra
-- fechar aqui).
-- ============================================================================


-- ============================================================================
-- 1) HUB — analises_viabilidade (1:1 por processo)
-- ============================================================================
-- Cabeçalho (§3), Finalidade (§4), Narrativas (§5), Objeto (§6, exceto
-- questões técnicas — tabela própria), Suficiência documental (§8),
-- Oportunidade diagnóstica/terapêutica (§15), Risco pericial (§23, INTERNO),
-- Provável raciocínio pericial (§25, INTERNO), Necessidade de especialista
-- — só o gatilho aqui, detalhe em caso_necessidade_especialista (§26),
-- Matriz final (§28), Conclusão (§29), Recomendação (§30), Próxima ação
-- (§31), Pós-entrega/satisfação (§39).
create table public.analises_viabilidade (
  id                              uuid primary key default gen_random_uuid(),
  processo_id                     uuid not null unique references public.processos(id) on delete cascade,

  -- ---- Cabeçalho (§3) ----
  status                          text not null default 'nao_iniciada'
                                    check (status in (
                                      'nao_iniciada', 'em_triagem_documental', 'aguardando_documentos',
                                      'em_analise_tecnica', 'aguardando_especialista', 'em_conclusao',
                                      'em_revisao', 'concluida'
                                    )),
  posicao_cliente_litigio        text,  -- catálogo editável (Paciente/Clínica/Hospital/Profissionais/Familiar responsável — semente da Dra. Fernanda, 19/09/2026)
  especialidade                  text,  -- catálogo editável — semente ainda pendente (confirmar com ela de qual app é a lista)
  materia                        jsonb, -- multisseleção, catálogo editável — nasce sem semente, só cresce pelo uso
  tags_tecnicas                  jsonb, -- multisseleção livre, opcional
  prazo_contratual_entrega       date,

  -- ---- Finalidade (§4) — multisseleção de vocabulário FECHADO ----
  finalidade                     jsonb not null default '[]'::jsonb,
  pergunta_central_advogado      text,

  -- ---- Narrativas (§5) — nunca viram fato automaticamente ----
  narrativa_advogado             text,
  narrativa_cliente              text,
  tese_inicial_apresentada       text,
  narrativa_fonte_informacao     text,

  -- ---- Objeto técnico-pericial (§6) ----
  objeto_analise                 text,

  -- ---- Suficiência documental (§8) ----
  suficiencia_documental          text check (suficiencia_documental in ('sim', 'parcialmente', 'nao')),

  -- ---- Oportunidade diagnóstica/terapêutica (§15) — bloco condicional ----
  oportunidade_diagnostica       text check (oportunidade_diagnostica in ('sim', 'nao', 'indeterminado', 'nao_aplicavel')),
  oportunidade_momento           text,
  oportunidade_sinais            text,
  oportunidade_exames            text,
  oportunidade_conduta_possivel  text,
  oportunidade_conduta_realizada text,
  oportunidade_houve_atraso      text check (oportunidade_houve_atraso in ('sim', 'nao')),
  oportunidade_duracao_estimada  text,
  oportunidade_repercussao       text,
  oportunidade_evidencias        text,
  oportunidade_grau_seguranca    text check (oportunidade_grau_seguranca in ('alto', 'moderado', 'baixo')),

  -- ---- Risco pericial (§23) — INTERNO, nunca no PDF (garantido pela assinatura da função geradora, não por coluna) ----
  risco_principal_tecnico        text,
  risco_fato_desfavoravel        text,
  risco_documento_prejudicial    text,
  risco_pergunta_dificil         text,
  risco_grau                     text check (risco_grau in ('baixo', 'moderado', 'alto', 'muito_alto')),
  risco_fundamentacao            text,  -- obrigatório na aplicação quando risco_grau in ('alto', 'muito_alto')

  -- ---- Provável raciocínio pericial em eventual judicialização (§25) — INTERNO, nunca no PDF ----
  -- Nota de simplificação: o spec lista 7 sub-campos pra esta seção (elementos
  -- valorizados, documentos determinantes, hipóteses alternativas,
  -- fragilidades, questões centrais, tendência técnica, pontos pra quesitos
  -- futuros) — é anotação de trabalho puramente interna, nunca reutilizada
  -- por outro módulo (não está na tabela de reutilização do §40) e nunca sai
  -- no PDF. Um campo de texto único é suficiente, sem perda de fidelidade
  -- pro que realmente importa (nunca vazar), e evita 7 colunas pra uma nota
  -- de rascunho.
  raciocinio_pericial_interno    text,

  -- ---- Necessidade de especialista (§26) — gatilho aqui, detalhe em caso_necessidade_especialista ----
  necessidade_especialista       text check (necessidade_especialista in ('nao', 'recomendavel', 'necessario')),

  -- ---- Matriz final de viabilidade (§28) — qualitativa, SEM score numérico automático ----
  matriz_suporte_documental      text,
  matriz_sustentacao_conduta     text,
  matriz_nexo                    text,
  matriz_dano                    text,
  matriz_fragilidades            text,
  matriz_provas_faltantes        text,
  matriz_risco_pericial          text,
  matriz_sustentacao_global      text,

  -- ---- Conclusão da viabilidade (§29) ----
  conclusao                      text check (conclusao in (
                                    'viavel', 'viavel_com_ressalvas', 'viabilidade_condicionada',
                                    'inconclusiva', 'nao_viavel'
                                  )),
  conclusao_fundamentacao        text,
  conclusao_elementos_favoraveis text,
  conclusao_fragilidades         text,
  conclusao_condicionantes       text,

  -- ---- Recomendação técnica (§30) — catálogo editável (ver nota de vocabulário no topo) ----
  recomendacao                   text,
  recomendacao_justificativa     text,

  -- ---- Próxima ação (§31) ----
  proxima_acao                   text,
  proxima_acao_responsavel       text,  -- catálogo editável, semente sugerida: Dra. Fernanda/Assessor/Atendimento/Financeiro
  proxima_acao_prazo             date,
  proxima_acao_prioridade        text,  -- catálogo editável — spec não lista opções fechadas

  -- ---- Pós-entrega e satisfação (§39) ----
  pos_entrega_reuniao            text check (pos_entrega_reuniao in ('sim', 'nao', 'agendar')),
  pos_entrega_retorno_d7_em      date,
  pos_entrega_satisfacao         text check (pos_entrega_satisfacao in (
                                    'muito_satisfeito', 'satisfeito', 'neutro', 'insatisfeito', 'muito_insatisfeito'
                                  )),

  -- ---- Proveniência (ver nota de versionamento no topo) ----
  origem_modulo                  text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo          text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),

  criado_por                     uuid references auth.users(id) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

comment on table public.analises_viabilidade is
  'Hub 1:1 por processo da Janela de Análise de Viabilidade Técnico-Pericial (spec PERICONS, 45 seções — ver memória analise-viabilidade-spec). processo_id é o CASO (reaproveita processos, sem coluna nova lá).';
comment on column public.analises_viabilidade.origem_modulo is
  'Proveniência da linha — só "viabilidade" existe hoje. Quando Estratégia Pericial for construída, o CHECK ganha o novo valor. Ver nota de versionamento no topo do arquivo.';
comment on column public.analises_viabilidade.atualizado_por_modulo is
  'Qual módulo fez a ÚLTIMA alteração nesta linha — mesma proveniência de origem_modulo, mas atualizado a cada UPDATE (aplicação, não trigger).';

create index idx_analises_viabilidade_status on public.analises_viabilidade (status);

create trigger trg_set_updated_at
  before update on public.analises_viabilidade
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 2) caso_questoes_tecnicas (§6 — "+ Adicionar questão técnica")
-- ============================================================================
create table public.caso_questoes_tecnicas (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  numero                 integer,
  questao                text not null,
  tema                   text,
  status                 text,
  resposta_preliminar    text,
  fonte                  text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_questoes_tecnicas_processo on public.caso_questoes_tecnicas (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_questoes_tecnicas
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 3) caso_documentos_avaliados (§7 — acervo documental, avaliação POR CASO)
-- ============================================================================
-- Reaproveita `documentos` (categoria/origem_profissional/data_documento/
-- páginas já existem desde a migration de Curatela, 21/08) pra tipo/data/
-- páginas/origem — NÃO duplica essas colunas aqui. Só a AVALIAÇÃO
-- específica desta análise (utilizado?/relevância/observação) é nova,
-- porque o mesmo documento pode ter relevância diferente em cada módulo
-- que o avaliar no futuro.
create table public.caso_documentos_avaliados (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  documento_id           uuid not null references public.documentos(id) on delete cascade,
  utilizado              boolean not null default true,
  relevancia             text check (relevancia in ('determinante', 'alta', 'media', 'baixa', 'sem_relevancia')),
  observacao_tecnica     text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.caso_documentos_avaliados is
  'Avaliação de um documento (já existente em `documentos`) NESTA análise — relevância e "utilizado?" são julgamento do módulo, não propriedade intrínseca do documento.';

create index idx_caso_documentos_avaliados_processo on public.caso_documentos_avaliados (processo_id);
create index idx_caso_documentos_avaliados_documento on public.caso_documentos_avaliados (documento_id);

create trigger trg_set_updated_at
  before update on public.caso_documentos_avaliados
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4) caso_documentos_faltantes (§9) — vira fonte 12 do agregador da Central
--    de Prazos (nunca insere em central_tarefas — ver nota no plano)
-- ============================================================================
create table public.caso_documentos_faltantes (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  documento_necessario   text not null,
  justificativa_tecnica  text,
  quem_provavelmente_possui text,
  prioridade             text,
  impacto                text check (impacto in ('impede_conclusao', 'limita_conclusao', 'importante', 'complementar')),
  responsavel            text,
  prazo                  date,
  status                 text,
  visivel_meu_perito     boolean not null default false,  -- §9: "se origem MEU PERITO e item visível, publica no portal" — portal não existe ainda, coluna nasce pronta
  resolvido_em           timestamptz,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.caso_documentos_faltantes is
  'Documento faltante → pendência. Aparece em /hoje e na Agenda via nova fonte do agregador da Central de Prazos (lê esta tabela direto) — nunca insere em central_tarefas, que é só pra cadastro manual dela (ver comentário da própria central_tarefas).';

create index idx_caso_documentos_faltantes_processo on public.caso_documentos_faltantes (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_documentos_faltantes
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 5) caso_linha_tempo_medica (§11)
-- ============================================================================
create table public.caso_linha_tempo_medica (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  data                   date not null,
  hora                   time,
  evento                 text not null,
  categoria              text check (categoria in (
                            'sintoma', 'atendimento', 'consulta', 'diagnostico', 'exame', 'prescricao',
                            'procedimento', 'cirurgia', 'intercorrencia', 'piora', 'oportunidade_diagnostica',
                            'oportunidade_terapeutica', 'alta', 'incapacidade', 'dano', 'obito', 'outro'
                          )),
  documento_id           uuid references public.documentos(id) on delete set null,
  pagina_ref             text,
  relevancia             text,
  observacao_tecnica     text,
  marco_critico          boolean not null default false,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.caso_linha_tempo_medica is
  'Cronologia médico-pericial do CASO — reutilizada por Estratégia/Preparação/Parecer/Relatório quando existirem (§40). Ligada a processo_id, não à análise.';

create index idx_caso_linha_tempo_medica_processo on public.caso_linha_tempo_medica (processo_id, data);

create trigger trg_set_updated_at
  before update on public.caso_linha_tempo_medica
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 6) caso_fatos_comprovados (§12)
-- ============================================================================
create table public.caso_fatos_comprovados (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  fato                   text not null,
  data                   date,
  documento_id           uuid references public.documentos(id) on delete set null,
  pagina_ref             text,
  relevancia             text,
  questao_tecnica_id     uuid references public.caso_questoes_tecnicas(id) on delete set null,
  classificacao          text not null check (classificacao in ('comprovado', 'parcialmente_comprovado', 'controvertido')),
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.caso_fatos_comprovados is
  'Só entra aqui o que foi validado manualmente (§12) — nunca populado automaticamente a partir de narrativa_advogado/narrativa_cliente. É essa separação de tabelas, sem pipeline de código entre as duas, que garante "narrativa nunca vira fato sozinha".';

create index idx_caso_fatos_comprovados_processo on public.caso_fatos_comprovados (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_fatos_comprovados
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7) caso_pontos_tecnicos (§13 — pontos técnicos relevantes / possíveis controvérsias)
-- ============================================================================
create table public.caso_pontos_tecnicos (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  ponto_tecnico          text not null,
  narrativa_apresentada  text,
  evidencia_documental   text,
  possivel_controversia  text,
  avaliacao_tecnica      text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_pontos_tecnicos_processo on public.caso_pontos_tecnicos (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_pontos_tecnicos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 8) caso_condutas_analisadas (§14)
-- ============================================================================
create table public.caso_condutas_analisadas (
  id                       uuid primary key default gen_random_uuid(),
  processo_id              uuid not null references public.processos(id) on delete cascade,
  profissional_instituicao text not null,
  papel                    text,
  periodo_inicio           date,
  periodo_fim              date,
  conduta_questionada      text,
  conduta_documentada      text,
  conduta_esperada         text,
  fonte                    text,
  literatura_norma         text,
  avaliacao                text check (avaliacao in (
                              'adequada', 'possivelmente_adequada', 'indeterminada',
                              'possivelmente_inadequada', 'inadequada'
                            )),
  repercussao              text,
  seguranca                text check (seguranca in ('alto', 'moderado', 'baixo')),
  origem_modulo            text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo    text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.caso_condutas_analisadas is
  'Aceita múltiplos profissionais/instituições (uma linha por agente avaliado) — §14 pede individualizar, nunca uma avaliação genérica só.';

create index idx_caso_condutas_analisadas_processo on public.caso_condutas_analisadas (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_condutas_analisadas
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 9) caso_nexo_causal (§16) — 1:1 por processo, bloco condicional
-- ============================================================================
create table public.caso_nexo_causal (
  id                                uuid primary key default gen_random_uuid(),
  processo_id                       uuid not null unique references public.processos(id) on delete cascade,
  aplicavel                         boolean not null default false,  -- "o caso exige análise de nexo?" — pergunta feita primeiro, na tela
  conduta_evento                    text,
  dano                              text,
  temporalidade                     text,
  topografia                        text,
  plausibilidade_biologica          text,
  compatibilidade_fisiopatologica   text,
  preexistencias                    text,
  concausas                         text,
  causas_alternativas_texto         text,
  intercorrencias_independentes     text,
  evidencias_favoraveis             text,
  evidencias_contrarias             text,
  fundamentacao                     text,
  conclusao                         text check (conclusao in (
                                       'fortemente_sustentado', 'sustentado', 'possivel',
                                       'indeterminado', 'pouco_sustentado', 'nao_sustentado'
                                     )),  -- NUNCA calculado automaticamente (§16) — sempre escolha manual dela
  origem_modulo                     text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo             text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por                        uuid references auth.users(id) on delete set null,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

comment on table public.caso_nexo_causal is
  '1:1 por processo — análise única de nexo, não repetível. Candidata natural a precisar de versionamento de verdade quando Estratégia Pericial existir (ver origem_modulo/atualizado_por_modulo e a nota no topo do arquivo): uma complementação futura não deve sobrescrever em silêncio o que a Viabilidade concluiu.';

create trigger trg_set_updated_at
  before update on public.caso_nexo_causal
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 10) caso_dano (§17) — 1:1 por processo
-- ============================================================================
create table public.caso_dano (
  id                        uuid primary key default gen_random_uuid(),
  processo_id               uuid not null unique references public.processos(id) on delete cascade,
  existe                    text check (existe in ('sim', 'nao', 'indeterminado')),
  natureza                  text,
  data_inicio               date,
  situacao_atual            text,
  temporario_permanente     text check (temporario_permanente in ('temporario', 'permanente')),
  reversibilidade           text,
  repercussao_funcional     text,
  tratamentos               text,
  necessidade_terceiros     text,
  prognostico               text,
  documentacao              text,
  atribuicao_causal         text,  -- SEMPRE separado de `existe` (§17: "separar sempre existência do dano de atribuição causal")
  origem_modulo             text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo     text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.caso_dano is
  '1:1 por processo — mesma nota de versionamento futuro de caso_nexo_causal.';

create trigger trg_set_updated_at
  before update on public.caso_dano
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 11) caso_incapacidade (§18) — 1:1 por processo, exibida só quando pertinente
-- ============================================================================
create table public.caso_incapacidade (
  id                                  uuid primary key default gen_random_uuid(),
  processo_id                         uuid not null unique references public.processos(id) on delete cascade,
  pertinente                          boolean not null default false,
  profissao                           text,
  atividade_habitual                  text,
  exigencias_funcionais               text,
  limitacoes                          text,
  incapacidade_atual                  text,
  parcial_total                       text check (parcial_total in ('parcial', 'total')),
  temporaria_permanente               text check (temporaria_permanente in ('temporaria', 'permanente')),
  reabilitacao                        text,
  data_provavel_inicio                date,
  prognostico                         text,
  necessidade_avaliacao_complementar  text,
  origem_modulo                       text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo               text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por                          uuid references auth.users(id) on delete set null,
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now()
);

comment on table public.caso_incapacidade is
  '1:1 por processo — mesma nota de versionamento futuro de caso_nexo_causal.';

create trigger trg_set_updated_at
  before update on public.caso_incapacidade
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 12) caso_causas_alternativas (§19)
-- ============================================================================
create table public.caso_causas_alternativas (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  hipotese               text not null,
  elementos_favoraveis   text,
  elementos_contrarios   text,
  documento_id           uuid references public.documentos(id) on delete set null,
  plausibilidade         text check (plausibilidade in ('alta', 'moderada', 'baixa', 'improvavel')),
  impacto_sobre_tese     text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_causas_alternativas_processo on public.caso_causas_alternativas (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_causas_alternativas
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 13) caso_pontos_favoraveis (§20)
-- ============================================================================
create table public.caso_pontos_favoraveis (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  descricao              text not null,
  documento_id           uuid references public.documentos(id) on delete set null,
  questao_tecnica_id     uuid references public.caso_questoes_tecnicas(id) on delete set null,
  importancia            text,
  forca_probatoria       text check (forca_probatoria in ('muito_forte', 'forte', 'moderada', 'fraca')),
  observacao             text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_pontos_favoraveis_processo on public.caso_pontos_favoraveis (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_pontos_favoraveis
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 14) caso_fragilidades (§21)
-- ============================================================================
create table public.caso_fragilidades (
  id                        uuid primary key default gen_random_uuid(),
  processo_id               uuid not null references public.processos(id) on delete cascade,
  descricao                 text not null,
  motivo                    text,
  evidencia                 text,
  impacto                   text check (impacto in ('critico', 'alto', 'moderado', 'baixo')),
  possibilidade_mitigacao   text,
  prova_necessaria          text,
  responsavel               text,
  prazo                     date,
  -- Se mitigável, o spec permite "gerar Oportunidade Probatória" — vínculo opcional, preenchido pela aplicação quando ela usar essa ação.
  oportunidade_probatoria_id uuid,  -- FK adicionada depois da criação de caso_oportunidades_probatorias, ver bloco 15 abaixo
  origem_modulo             text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo     text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_caso_fragilidades_processo on public.caso_fragilidades (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_fragilidades
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 15) caso_oportunidades_probatorias (§22) — vira fonte 13 do agregador
--     (mesmo princípio de caso_documentos_faltantes: nunca insere em
--     central_tarefas, o agregador lê esta tabela direto)
-- ============================================================================
create table public.caso_oportunidades_probatorias (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  providencia            text not null,
  tipo_prova             text check (tipo_prova in (
                            'documento', 'prontuario', 'exame', 'relatorio_medico', 'especialista',
                            'futura_pericia', 'quesito', 'diligencia', 'literatura', 'informacao_complementar', 'outro'
                          )),
  objetivo               text,
  responsavel            text,
  prazo                  date,
  prioridade             text,
  status                 text,
  resolvido_em           timestamptz,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.caso_oportunidades_probatorias is
  'Oportunidade probatória → pendência. Mesmo princípio de caso_documentos_faltantes: aparece em /hoje e na Agenda via fonte própria do agregador da Central de Prazos, nunca insere em central_tarefas.';

create index idx_caso_oportunidades_probatorias_processo on public.caso_oportunidades_probatorias (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_oportunidades_probatorias
  for each row execute function public.set_updated_at();

alter table public.caso_fragilidades
  add constraint caso_fragilidades_oportunidade_probatoria_fk
    foreign key (oportunidade_probatoria_id) references public.caso_oportunidades_probatorias(id) on delete set null;


-- ============================================================================
-- 16) caso_tese_adversa (§24) — INTEIRAMENTE INTERNA, nunca no PDF
-- ============================================================================
create table public.caso_tese_adversa (
  id                        uuid primary key default gen_random_uuid(),
  processo_id               uuid not null references public.processos(id) on delete cascade,
  argumento_previsivel      text not null,
  fundamento_possivel       text,
  documento_id              uuid references public.documentos(id) on delete set null,
  resposta_tecnica_possivel text,
  prova_necessaria          text,
  forca_estimada            text,
  origem_modulo             text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo     text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.caso_tese_adversa is
  '"Possível Tese Adversa" (§24) — como ainda não há defesa formal. INTEIRAMENTE interna: a função geradora do PDF (fatia 8) não aceita esta tabela como entrada, nunca. Reutilizada por Estratégia/futura Réplica/Análise do Laudo quando existirem (§40), sempre internamente.';

create index idx_caso_tese_adversa_processo on public.caso_tese_adversa (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_tese_adversa
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 17) caso_literatura_utilizada (§27) — vínculo com Biblioteca Pericial
-- ============================================================================
-- Biblioteca Pericial é o CATÁLOGO reaproveitável entre casos (já existe,
-- ver migration 20260924120000). Aqui é só o que foi de fato CITADO neste
-- caso, com o ponto da análise em que foi usado — por isso FK opcional pra
-- lá, mais campos soltos pra quando é uma referência avulsa, não catalogada.
create table public.caso_literatura_utilizada (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  biblioteca_pericial_id uuid references public.biblioteca_pericial(id) on delete set null,
  titulo                 text not null,
  autor_entidade         text,
  tipo                   text check (tipo in (
                            'guideline', 'consenso', 'artigo', 'protocolo', 'resolucao',
                            'diretriz', 'livro', 'legislacao', 'norma', 'outro'
                          )),
  ano                    integer,
  identificador_link     text,
  tema                   text,
  conceito_relevante     text,
  ponto_analise_utilizado text,
  arquivo_documento_id   uuid references public.documentos(id) on delete set null,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_literatura_utilizada_processo on public.caso_literatura_utilizada (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_literatura_utilizada
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 18) caso_necessidade_especialista (§26 — detalhe, gatilho fica no hub)
-- ============================================================================
-- Decisão da Dra. Fernanda (21/09/2026): campo de texto (nome + especialidade)
-- mais anexo de documento, reaproveitando o pipeline de Documentos que já
-- existe (mesmo bucket, mesmo padrão) — sem upload novo. O vínculo do
-- documento com ESTE registro específico é a coluna nova em `documentos`
-- logo abaixo (mesmo padrão já usado por documentos.etapa_at).
create table public.caso_necessidade_especialista (
  id                     uuid primary key default gen_random_uuid(),
  processo_id            uuid not null references public.processos(id) on delete cascade,
  nome_especialista      text,
  especialidade          text,
  finalidade             text,
  questao_tecnica_id     uuid references public.caso_questoes_tecnicas(id) on delete set null,
  prioridade             text,
  prazo                  date,
  status                 text,
  origem_modulo          text not null default 'viabilidade' check (origem_modulo in ('viabilidade')),
  atualizado_por_modulo  text not null default 'viabilidade' check (atualizado_por_modulo in ('viabilidade')),
  criado_por             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_caso_necessidade_especialista_processo on public.caso_necessidade_especialista (processo_id);

create trigger trg_set_updated_at
  before update on public.caso_necessidade_especialista
  for each row execute function public.set_updated_at();

alter table public.documentos
  add column necessidade_especialista_id uuid references public.caso_necessidade_especialista(id) on delete set null;

comment on column public.documentos.necessidade_especialista_id is
  'Vínculo opcional com caso_necessidade_especialista — mesmo padrão já usado por documentos.etapa_at (migration 20260922120000): reaproveita o pipeline de Documentos existente (mesmo bucket, mesmo upload) em vez de criar upload novo.';


-- ============================================================================
-- RLS — mesmo padrão de acesso total pra authenticated de todas as outras
-- tabelas do sistema (ver 20260823100000_rls_policies_authenticated_full_access.sql)
-- ============================================================================
alter table public.analises_viabilidade         enable row level security;
alter table public.caso_questoes_tecnicas       enable row level security;
alter table public.caso_documentos_avaliados    enable row level security;
alter table public.caso_documentos_faltantes    enable row level security;
alter table public.caso_linha_tempo_medica      enable row level security;
alter table public.caso_fatos_comprovados       enable row level security;
alter table public.caso_pontos_tecnicos         enable row level security;
alter table public.caso_condutas_analisadas     enable row level security;
alter table public.caso_nexo_causal             enable row level security;
alter table public.caso_dano                    enable row level security;
alter table public.caso_incapacidade            enable row level security;
alter table public.caso_causas_alternativas     enable row level security;
alter table public.caso_pontos_favoraveis       enable row level security;
alter table public.caso_fragilidades            enable row level security;
alter table public.caso_oportunidades_probatorias enable row level security;
alter table public.caso_tese_adversa            enable row level security;
alter table public.caso_literatura_utilizada    enable row level security;
alter table public.caso_necessidade_especialista enable row level security;

create policy "analises_viabilidade_full_access" on public.analises_viabilidade
  for all to authenticated using (true) with check (true);
create policy "caso_questoes_tecnicas_full_access" on public.caso_questoes_tecnicas
  for all to authenticated using (true) with check (true);
create policy "caso_documentos_avaliados_full_access" on public.caso_documentos_avaliados
  for all to authenticated using (true) with check (true);
create policy "caso_documentos_faltantes_full_access" on public.caso_documentos_faltantes
  for all to authenticated using (true) with check (true);
create policy "caso_linha_tempo_medica_full_access" on public.caso_linha_tempo_medica
  for all to authenticated using (true) with check (true);
create policy "caso_fatos_comprovados_full_access" on public.caso_fatos_comprovados
  for all to authenticated using (true) with check (true);
create policy "caso_pontos_tecnicos_full_access" on public.caso_pontos_tecnicos
  for all to authenticated using (true) with check (true);
create policy "caso_condutas_analisadas_full_access" on public.caso_condutas_analisadas
  for all to authenticated using (true) with check (true);
create policy "caso_nexo_causal_full_access" on public.caso_nexo_causal
  for all to authenticated using (true) with check (true);
create policy "caso_dano_full_access" on public.caso_dano
  for all to authenticated using (true) with check (true);
create policy "caso_incapacidade_full_access" on public.caso_incapacidade
  for all to authenticated using (true) with check (true);
create policy "caso_causas_alternativas_full_access" on public.caso_causas_alternativas
  for all to authenticated using (true) with check (true);
create policy "caso_pontos_favoraveis_full_access" on public.caso_pontos_favoraveis
  for all to authenticated using (true) with check (true);
create policy "caso_fragilidades_full_access" on public.caso_fragilidades
  for all to authenticated using (true) with check (true);
create policy "caso_oportunidades_probatorias_full_access" on public.caso_oportunidades_probatorias
  for all to authenticated using (true) with check (true);
create policy "caso_tese_adversa_full_access" on public.caso_tese_adversa
  for all to authenticated using (true) with check (true);
create policy "caso_literatura_utilizada_full_access" on public.caso_literatura_utilizada
  for all to authenticated using (true) with check (true);
create policy "caso_necessidade_especialista_full_access" on public.caso_necessidade_especialista
  for all to authenticated using (true) with check (true);
