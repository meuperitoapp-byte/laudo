-- ============================================================================
-- Módulo Pós-Laudo — schema (fatia 0)
-- ============================================================================
-- Fundação do módulo de esclarecimentos / retificação / complementação após o
-- laudo entregue. Vale para Perícia Judicial E Assistência Técnica desde já.
-- Plano completo: docs/plano-modulo-pos-laudo.md.
--
-- Cria 7 tabelas novas e ESTENDE public.laudos_gerados (não cria tabela
-- paralela — ver plano §1.3). Todas as colunas novas de laudos_gerados são
-- nullable ou têm default: nenhuma linha existente quebra.
--
-- RLS: mesmo padrão do resto do schema — habilitada + policy
-- authenticated_full_access (2 perfis: perita e secretária, ambos com acesso
-- total). Trigger set_updated_at() e função gen_random_uuid()/pgcrypto já
-- existem desde 20260821120000.
-- ============================================================================


-- ============================================================================
-- pos_laudo_ciclos — uma rodada de pós-laudo (repetível por processo)
-- ============================================================================
-- Cada vez que, depois do laudo protocolado, as partes/juízo se manifestam
-- (impugnam, pedem esclarecimento, juntam documento, pedem complementação),
-- abre-se um ciclo. Um processo pode ter vários ciclos ao longo do tempo.
create table public.pos_laudo_ciclos (
  id                        uuid primary key default gen_random_uuid(),
  processo_id               uuid not null references public.processos(id) on delete cascade,
  numero_ciclo              integer not null,          -- 1, 2, 3... por processo
  fluxo                     text not null
                              check (fluxo in ('judicial', 'assistencia_tecnica')),
  status                    text not null default 'aberto'
                              check (status in ('aberto', 'triagem', 'em_resposta',
                                                'aguardando_protocolo', 'protocolado', 'encerrado')),

  -- Registro da demanda (entrada). O arquivo da intimação é OPCIONAL — nunca
  -- bloqueia a abertura do ciclo (decisão Dra./Jeferson 03/09/2026); a UI
  -- mostra aviso de pendência enquanto documento_intimacao_id for null.
  data_intimacao            date,
  prazo                     date,
  origem                    text
                              check (origem in ('autor', 'reu', 'ambos', 'juizo', 'mp', 'outro')),
  natureza                  text[] not null default '{}',  -- vocabulário fixo, validado na aplicação (mesmo padrão de processos.etapas_contratadas): concordancia / impugnacao / esclarecimentos / quesitos_suplementares / complementacao / documento_novo / nova_pericia / determinacao_judicial / outra
  documento_intimacao_id    uuid references public.documentos(id) on delete set null,

  -- Judicial: o Laudo V1 da própria perita. AT: null (o laudo do perito
  -- judicial é externo e entra por pos_laudo_documentos.papel = 'laudo_analisado').
  -- NO ACTION (default): bloqueia apagar um laudos_gerados ainda referenciado,
  -- mas NÃO trava o cascade de apagar o processo inteiro (o ciclo e o laudo
  -- morrem juntos nesse caso; a checagem é diferida pro fim da transação).
  laudo_base_id             uuid references public.laudos_gerados(id),

  -- Classificação global do laudo — OBRIGATÓRIA no fluxo AT, nula no judicial
  -- (validado na aplicação; sem CHECK cross-coluna aqui de propósito).
  classificacao_global      text
                              check (classificacao_global in ('favoravel', 'parc_favoravel',
                                                              'neutro', 'parc_desfavoravel', 'desfavoravel')),

  -- Triagem, nível de ciclo (campo obrigatório do módulo).
  pode_modificar_conclusao  text
                              check (pode_modificar_conclusao in ('nao', 'potencialmente',
                                                                  'sim', 'depende_complementacao')),
  -- Ligado automaticamente quando algum ponto da matriz é classificado como
  -- 'necessidade_complementacao' (ação automática confirmada pela Dra.).
  rascunho_complementacao   boolean not null default false,

  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  encerrado_em              timestamptz,

  unique (processo_id, numero_ciclo)
);

comment on table public.pos_laudo_ciclos is
  'Rodada de pós-laudo (repetível por processo). fluxo é denormalizado de processos.tipo_trabalho de propósito — congela o rito do ciclo. status é próprio do ciclo, independente de processos.situacao_processo.';
comment on column public.pos_laudo_ciclos.natureza is
  'Array de códigos (vocabulário fixo, validado na aplicação): concordancia, impugnacao, esclarecimentos, quesitos_suplementares, complementacao, documento_novo, nova_pericia, determinacao_judicial, outra.';
comment on column public.pos_laudo_ciclos.laudo_base_id is
  'Judicial: laudos_gerados do Laudo V1 da própria perita. AT: null (laudo externo entra por pos_laudo_documentos).';
comment on column public.pos_laudo_ciclos.documento_intimacao_id is
  'Arquivo da intimação que abriu o ciclo. OPCIONAL — nunca bloqueia a abertura; a UI sinaliza pendência enquanto null.';

create index idx_pos_laudo_ciclos_processo on public.pos_laudo_ciclos (processo_id);

create trigger trg_set_updated_at
  before update on public.pos_laudo_ciclos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- pos_laudo_pontos — matriz de enfrentamento ponto a ponto
-- ============================================================================
-- Cada ponto questionado / problema do laudo vira uma linha estruturada, não
-- uma caixa de texto livre. Unifica "Análise dos Pontos Questionados" do
-- modelo de Esclarecimentos, "Matriz de Problemas do Laudo" do spec AT e a
-- "Matriz de enfrentamento" da memória.
create table public.pos_laudo_pontos (
  id                          uuid primary key default gen_random_uuid(),
  ciclo_id                    uuid not null references public.pos_laudo_ciclos(id) on delete cascade,
  ordem                       integer not null,

  origem_ponto                text,   -- autor / réu / juízo / MP / at_interno / perito (texto livre)
  tema                        text,
  sintese_alegacao            text,   -- o questionamento apresentado (importado da manifestação, quando houver)
  ja_abordado_no_laudo        boolean,
  referencia_laudo            text,   -- página/item do laudo V1

  -- Triagem: UMA classificação por ponto (Dra. confirmou).
  classificacao_triagem       text
                                check (classificacao_triagem in (
                                  'questionamento_pertinente', 'esclarecimento_legitimo',
                                  'quesito_suplementar_pertinente', 'documento_novo_relevante',
                                  'necessidade_complementacao', 'divergencia_interpretativa',
                                  'mero_inconformismo', 'reiteracao_quesito',
                                  'questao_juridica_fora_objeto')),
  potencial_alterar_conclusao text
                                check (potencial_alterar_conclusao in ('nao', 'potencialmente',
                                                                       'sim', 'depende_complementacao')),
  fundamentacao_adicional     text,

  -- Fase "matriz de enfrentamento": a resposta técnica do perito àquele ponto.
  resposta_tecnica            text,
  repercussao                 text
                                check (repercussao in (
                                  'ponto_ja_esclarecido', 'fundamentacao_complementada',
                                  'retificacao_necessaria', 'conclusao_parcialmente_modificada',
                                  'sem_repercussao')),

  -- Só AT (spec AT §14 — lista longa, vocabulário ainda pode evoluir): omissao,
  -- contradicao_interna, contradicao_documental, erro_tecnico, premissa_incorreta,
  -- ausencia_fundamentacao, etc. Sem CHECK de propósito.
  categoria_problema          text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.pos_laudo_pontos is
  'Matriz de enfrentamento ponto a ponto de um ciclo de pós-laudo. classificacao_triagem = uma por ponto.';
comment on column public.pos_laudo_pontos.categoria_problema is
  'Só fluxo AT. Texto livre (vocabulário do spec AT §14, ainda pode crescer) — sem CHECK.';

create index idx_pos_laudo_pontos_ciclo on public.pos_laudo_pontos (ciclo_id);

create trigger trg_set_updated_at
  before update on public.pos_laudo_pontos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- pos_laudo_ponto_evidencias — rastreabilidade (paridade com resposta_evidencias)
-- ============================================================================
-- Liga um ponto da matriz aos documentos e/ou achados do laudo original que o
-- sustentam. Formato geral de resposta_evidencias (só created_at, sem
-- updated_at), MAS documento_id diverge dela de propósito: aqui é NO ACTION,
-- não CASCADE (ver comentário na coluna) — mesmo padrão de
-- pos_laudo_documentos.documento_id, pra não apagar uma evidência da matriz
-- silenciosamente quando o documento é removido em outro lugar.
create table public.pos_laudo_ponto_evidencias (
  id                     uuid primary key default gen_random_uuid(),
  ponto_id               uuid not null references public.pos_laudo_pontos(id) on delete cascade,
  -- NO ACTION (default), não CASCADE: apagar avulso um documento citado como
  -- evidência de um ponto é BLOQUEADO — precisa desvincular a evidência
  -- antes. Padronizado com pos_laudo_documentos.documento_id.
  documento_id           uuid references public.documentos(id),
  resposta_processo_id   uuid references public.respostas_processo(id) on delete cascade,
  observacao             text,
  created_at             timestamptz not null default now(),
  check (documento_id is not null or resposta_processo_id is not null)
);

comment on table public.pos_laudo_ponto_evidencias is
  'Vincula um ponto da matriz a um documento e/ou a um achado do laudo (respostas_processo) que o sustenta.';

create index idx_pos_laudo_ponto_evidencias_ponto on public.pos_laudo_ponto_evidencias (ponto_id);
create index idx_pos_laudo_ponto_evidencias_documento on public.pos_laudo_ponto_evidencias (documento_id);


-- ============================================================================
-- pos_laudo_documentos — metadados de ciclo para documentos supervenientes
-- ============================================================================
-- Abordagem híbrida (decisão Jeferson 03/09/2026): o ARQUIVO fica 100% em
-- public.documentos, subindo pelo mesmo pipeline de upload / bucket privado /
-- signed URL que já existe. Esta tabela guarda só os metadados que são DO
-- CICLO. A regra "nunca incorporar ao acervo original" é um anti-join em
-- compilarLaudo (ver plano §1.7), não uma coluna nova em documentos.
create table public.pos_laudo_documentos (
  id                          uuid primary key default gen_random_uuid(),
  ciclo_id                    uuid not null references public.pos_laudo_ciclos(id) on delete cascade,
  -- NO ACTION (default): apagar avulso um documento que um ciclo classificou é
  -- BLOQUEADO (protege a trilha de auditoria) — precisa remover este vínculo
  -- antes. Mas o cascade de apagar o processo inteiro passa (este vínculo morre
  -- junto via ciclo_id; a checagem é diferida pro fim da transação).
  documento_id                uuid not null references public.documentos(id),

  papel                       text not null default 'superveniente'
                                check (papel in ('superveniente', 'laudo_analisado', 'manifestacao_analisada')),
  apresentante                text,   -- autor / réu / juízo / outro
  data_juntada                date,
  paginas                     text,
  existencia_previa           boolean,           -- já existia antes do laudo V1?
  disponivel_ao_perito_antes  boolean,           -- estava disponível ao perito à época? (rastreabilidade temporal)
  relevancia                  text
                                check (relevancia in ('sem_relevancia', 'complementar', 'relevante',
                                                      'potencialmente_modificador', 'determinante')),
  impacto                     text,
  ja_enfrentado               boolean not null default false,  -- o ponto já foi respondido na matriz?
  observacao_tecnica          text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  unique (ciclo_id, documento_id)
);

comment on table public.pos_laudo_documentos is
  'Metadados de ciclo para documentos supervenientes / laudo analisado / manifestação analisada. O arquivo em si vive em public.documentos. compilarLaudo exclui estes documento_id do acervo do laudo original (plano §1.7).';
comment on column public.pos_laudo_documentos.papel is
  'superveniente = juntado após o laudo V1; laudo_analisado = laudo do perito judicial (fluxo AT); manifestacao_analisada = a impugnação/pedido que motivou o ciclo.';

create index idx_pos_laudo_documentos_ciclo on public.pos_laudo_documentos (ciclo_id);
create index idx_pos_laudo_documentos_documento on public.pos_laudo_documentos (documento_id);

create trigger trg_set_updated_at
  before update on public.pos_laudo_documentos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- pos_laudo_retificacao_itens — tabela "onde se lê / leia-se"
-- ============================================================================
-- Correções pontuais de erro material. Ficam à parte porque, se a "Análise da
-- Repercussão" der SIM (afeta fundamentação/conclusão), o ciclo é
-- redirecionado para Complementação e estes itens são CARREGADOS para lá sem
-- serem perdidos (plano §1.5) — a lógica desse redirecionamento é da
-- aplicação (finalizarRetificacao), não do banco.
create table public.pos_laudo_retificacao_itens (
  id                  uuid primary key default gen_random_uuid(),
  ciclo_id            uuid not null references public.pos_laudo_ciclos(id) on delete cascade,
  -- qual versão está sendo retificada (V1, ou um esclarecimento/complementação
  -- anterior). NO ACTION (default) — mesma lógica de laudo_base_id.
  documento_alvo_id   uuid references public.laudos_gerados(id),
  ordem               integer not null,
  pagina              text,
  item_secao          text,
  onde_se_le          text not null,   -- transcrição exata do trecho original
  leia_se             text not null,
  natureza_erro       text,            -- digitacao / grafia / nome / data / valor / referencia / omissao / formatacao / outro (texto livre)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.pos_laudo_retificacao_itens is
  'Itens "onde se lê / leia-se" de uma Retificação de Erro Material. Persistem independentemente de a saída final ser Retificação ou (se afeta a conclusão) Complementação.';

create index idx_pos_laudo_retificacao_itens_ciclo on public.pos_laudo_retificacao_itens (ciclo_id);

create trigger trg_set_updated_at
  before update on public.pos_laudo_retificacao_itens
  for each row execute function public.set_updated_at();


-- ============================================================================
-- pos_laudo_quesitos — quesitos suplementares / de esclarecimento DO CICLO
-- ============================================================================
-- Separados de public.quesitos de propósito (Dra. confirmou: quesitos
-- suplementares ficam SÓ dentro do ciclo de pós-laudo, não entram na aba
-- Quesitos do laudo). Um mesmo quesito reperguntado numa rodada posterior
-- entra como LINHA NOVA (nunca substitui) — mesma regra de não sobrescrever
-- versão protocolada.
create table public.pos_laudo_quesitos (
  id                            uuid primary key default gen_random_uuid(),
  ciclo_id                      uuid not null references public.pos_laudo_ciclos(id) on delete cascade,
  ponto_id                      uuid references public.pos_laudo_pontos(id) on delete set null,  -- ponto da matriz que originou (quando "gerar quesito de esclarecimento")
  tipo                          text not null
                                  check (tipo in ('suplementar', 'esclarecimento')),
  origem                        text,   -- autor / réu / juízo / outro
  numero                        integer,
  pergunta                      text not null,
  resposta                      text,   -- judicial: a perita responde. AT: null (a AT elabora o quesito pro advogado apresentar).
  objetivo_estrategico_interno  text,   -- só AT — nunca migra pro documento gerado
  status                        text not null default 'rascunho'
                                  check (status in ('rascunho', 'revisado', 'aprovado', 'excluido')),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

comment on table public.pos_laudo_quesitos is
  'Quesitos suplementares / de esclarecimento de um ciclo. NÃO entram em public.quesitos (Dra. confirmou). Repergunta em ciclo posterior = linha nova, nunca substitui.';

create index idx_pos_laudo_quesitos_ciclo on public.pos_laudo_quesitos (ciclo_id);

create trigger trg_set_updated_at
  before update on public.pos_laudo_quesitos
  for each row execute function public.set_updated_at();


-- ============================================================================
-- pos_laudo_conclusoes_vigentes — log append-only da "Conclusão Vigente"
-- ============================================================================
-- "Qual a conclusão médico-pericial vigente do processo AGORA" = a única linha
-- com substituida_em IS NULL. Semeada com a conclusão do Laudo V1. Só
-- Esclarecimentos e Complementação criam linha nova (quando a repercussão
-- altera/substitui a conclusão). RETIFICAÇÃO estruturalmente não pode:
-- 'retificacao' está AUSENTE do CHECK de origem_tipo de propósito.
create table public.pos_laudo_conclusoes_vigentes (
  id                      uuid primary key default gen_random_uuid(),
  processo_id             uuid not null references public.processos(id) on delete cascade,
  -- ATENÇÃO: 'retificacao' NÃO entra aqui. É a garantia estrutural de que uma
  -- retificação nunca cria conclusão vigente (plano §1.6). Este é um dos 2
  -- CHECKs que vão precisar de ALTER quando as respostas do fluxo AT chegarem.
  origem_tipo             text not null
                            check (origem_tipo in ('laudo', 'esclarecimentos', 'complementacao')),
  origem_laudo_gerado_id  uuid references public.laudos_gerados(id),  -- NO ACTION (default) — mesma lógica de laudo_base_id
  ciclo_id                uuid references public.pos_laudo_ciclos(id) on delete set null,  -- null na linha semente (V1)
  texto                   text not null,
  escopo                  text not null default 'integral'
                            check (escopo in ('integral', 'parcial')),
  vigente_desde           timestamptz not null default now(),
  substituida_em          timestamptz,        -- null = é a vigente agora
  substituida_por_id      uuid references public.pos_laudo_conclusoes_vigentes(id) on delete set null,
  created_by              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now()
);

comment on table public.pos_laudo_conclusoes_vigentes is
  'Log append-only da conclusão médico-pericial vigente por processo. A vigente é a linha com substituida_em IS NULL. origem_tipo NUNCA é retificacao (garantia estrutural — plano §1.6).';

-- Índice PARCIAL ÚNICO: faz papel duplo —
--   (1) CORREÇÃO: garante no máximo UMA conclusão vigente por processo;
--   (2) PERFORMANCE: é o índice que a consulta "conclusão vigente agora"
--       (WHERE processo_id = $1 AND substituida_em IS NULL) usa.
create unique index uq_pos_laudo_conclusao_vigente_por_processo
  on public.pos_laudo_conclusoes_vigentes (processo_id)
  where substituida_em is null;

-- Ao inserir uma nova conclusão vigente, carimba automaticamente a anterior
-- como substituída. Torna "registrar nova conclusão" um único INSERT e impede
-- violar o índice único acima. (BEFORE INSERT: new.id já está populado pelo
-- default da coluna, então substituida_por_id fica consistente.)
create or replace function public.pos_laudo_conclusao_supersede()
returns trigger
language plpgsql
as $$
begin
  update public.pos_laudo_conclusoes_vigentes
     set substituida_em = now(),
         substituida_por_id = new.id
   where processo_id = new.processo_id
     and substituida_em is null;
  return new;
end;
$$;

create trigger trg_pos_laudo_conclusao_supersede
  before insert on public.pos_laudo_conclusoes_vigentes
  for each row execute function public.pos_laudo_conclusao_supersede();


-- ============================================================================
-- laudos_gerados — ESTENDIDA (não é tabela nova) para carregar também
-- Esclarecimentos / Retificação / Complementação como versões V2, V3... do
-- mesmo processo. Plano §1.3.
-- ============================================================================
-- Todas as colunas novas são nullable ou têm default => nenhuma linha
-- existente quebra. As linhas atuais passam a ter tipo = 'laudo' (default).
alter table public.laudos_gerados
  -- 2º dos 2 CHECKs que vão precisar de ALTER quando as respostas AT chegarem
  -- (os valores *_at já estão aqui, mas (a)/(b) podem renomear/acrescentar).
  add column tipo                 text not null default 'laudo'
                                    check (tipo in ('laudo', 'esclarecimentos', 'retificacao',
                                                    'complementacao', 'parecer_at', 'manifestacao_at',
                                                    'impugnacao_at', 'parecer_divergente_at')),
  add column pos_laudo_ciclo_id   uuid references public.pos_laudo_ciclos(id) on delete set null,
  add column titulo               text,
  add column substitui_conclusao  boolean not null default false,
  add column protocolado          boolean not null default false,
  add column protocolo_id         text,
  add column protocolado_em       timestamptz,
  add column paginas              integer;

-- Rede de segurança (a regra de negócio é na aplicação, plano §1.5): uma
-- retificação NUNCA substitui conclusão. Linhas atuais (tipo='laudo',
-- substitui_conclusao=false) passam.
alter table public.laudos_gerados
  add constraint laudos_gerados_retificacao_nao_altera_conclusao
    check (not (tipo = 'retificacao' and substitui_conclusao = true));

comment on column public.laudos_gerados.tipo is
  'laudo (V1) | esclarecimentos | retificacao | complementacao | parecer_at | manifestacao_at | impugnacao_at | parecer_divergente_at. Discrimina a forma de snapshot_respostas.';
comment on column public.laudos_gerados.pos_laudo_ciclo_id is
  'null para o Laudo V1; preenchido para documentos gerados dentro de um ciclo de pós-laudo.';
comment on column public.laudos_gerados.substitui_conclusao is
  'true só quando o documento altera/substitui a conclusão vigente (Esclarecimentos/Complementação). Nunca true para tipo = retificacao (CHECK).';
comment on column public.laudos_gerados.paginas is
  'Total de páginas do PDF definitivo (modelo pede "composto por [X] páginas"). Preenchido após a geração.';

create index idx_laudos_gerados_pos_laudo_ciclo on public.laudos_gerados (pos_laudo_ciclo_id);

-- Congela o CONTEÚDO do documento depois de protocolado, não a linha inteira:
-- arquivo (storage_path_pdf/docx), snapshot_respostas, tipo, versao,
-- substitui_conclusao, pos_laudo_ciclo_id, titulo e paginas ficam travados
-- (titulo aparece dentro da peça protocolada; paginas é derivado do PDF
-- congelado — se o conteúdo não muda, a contagem também não pode). Os
-- metadados OPERACIONAIS do protocolo (protocolo_id, protocolado_em — e
-- qualquer outra coluna fora desta lista) continuam corrigíveis mesmo depois
-- de protocolado = true (ex.: número de protocolo digitado errado). A
-- transição protocolado false -> true passa sempre: a comparação só roda
-- quando OLD.protocolado já era true.
create or replace function public.laudos_gerados_congela_protocolado()
returns trigger
language plpgsql
as $$
begin
  if old.protocolado then
    if new.storage_path_pdf   is distinct from old.storage_path_pdf
    or new.storage_path_docx  is distinct from old.storage_path_docx
    or new.snapshot_respostas is distinct from old.snapshot_respostas
    or new.tipo                is distinct from old.tipo
    or new.versao               is distinct from old.versao
    or new.substitui_conclusao is distinct from old.substitui_conclusao
    or new.pos_laudo_ciclo_id  is distinct from old.pos_laudo_ciclo_id
    or new.titulo               is distinct from old.titulo
    or new.paginas              is distinct from old.paginas
    then
      raise exception
        'laudos_gerados %: versao ja protocolada — conteudo do documento (arquivo, snapshot, tipo, versao, substitui_conclusao, pos_laudo_ciclo_id, titulo, paginas) nao pode ser alterado; protocolo_id/protocolado_em continuam corrigiveis',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_laudos_gerados_congela
  before update on public.laudos_gerados
  for each row execute function public.laudos_gerados_congela_protocolado();


-- ============================================================================
-- pos_laudo_ciclos — trava de exclusão (depende de laudos_gerados.protocolado,
-- por isso só entra aqui, depois do ALTER acima)
-- ============================================================================
-- Apagar um ciclo hoje (FK pos_laudo_documentos.ciclo_id etc. em CASCADE)
-- levaria junto pontos/documentos/quesitos do ciclo — aceitável enquanto são
-- rascunho. Mas se o ciclo já gerou um documento PROTOCOLADO
-- (laudos_gerados.pos_laudo_ciclo_id -> este ciclo, protocolado = true), esse
-- documento sobreviveria órfão (pos_laudo_ciclo_id vira null por SET NULL) e a
-- trilha de auditoria — "este esclarecimento veio de qual ciclo" — se perde.
-- Trigger, não aplicação: é checagem de integridade referencial pura (não
-- envolve orquestração de negócio como a trava da Retificação), e barrado no
-- banco vale pra qualquer chamador (UI futura, script, console SQL), não só
-- pro caminho que a aplicação decidir cobrir. Mesma filosofia dos outros dois
-- triggers desta migration.
--
-- EFEITO COLATERAL CONFIRMADO E MANTIDO DE PROPÓSITO (Jeferson 03/09/2026):
-- como pos_laudo_ciclos.processo_id também é CASCADE, apagar um PROCESSO que
-- tenha ciclo com documento protocolado dispara esta mesma trava e aborta a
-- exclusão do processo inteiro (não só do ciclo) — a ordem do cascade não
-- garante que o laudos_gerados já tenha sumido quando o trigger do ciclo
-- roda. Hoje não existe nenhuma ação de apagar processo no app; se um dia
-- existir, ela deve FALHAR com mensagem clara em processos com pós-laudo
-- protocolado, em vez de apagar peça protocolada em silêncio. Não restringir
-- esta trava só ao delete direto de ciclo.
create or replace function public.pos_laudo_ciclo_bloqueia_delete_com_protocolo()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.laudos_gerados
     where pos_laudo_ciclo_id = old.id
       and protocolado = true
  ) then
    raise exception
      'pos_laudo_ciclos %: nao pode ser apagado — tem documento(s) protocolado(s) vinculado(s)',
      old.id;
  end if;
  return old;
end;
$$;

create trigger trg_pos_laudo_ciclo_bloqueia_delete_com_protocolo
  before delete on public.pos_laudo_ciclos
  for each row execute function public.pos_laudo_ciclo_bloqueia_delete_com_protocolo();


-- ============================================================================
-- RLS — habilitada + policy authenticated_full_access nas 7 tabelas novas
-- (mesmo padrão de respostas_secao / processo_partes).
-- ============================================================================
alter table public.pos_laudo_ciclos               enable row level security;
alter table public.pos_laudo_pontos               enable row level security;
alter table public.pos_laudo_ponto_evidencias     enable row level security;
alter table public.pos_laudo_documentos           enable row level security;
alter table public.pos_laudo_retificacao_itens    enable row level security;
alter table public.pos_laudo_quesitos             enable row level security;
alter table public.pos_laudo_conclusoes_vigentes  enable row level security;

create policy "authenticated_full_access" on public.pos_laudo_ciclos
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_pontos
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_ponto_evidencias
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_documentos
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_retificacao_itens
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_quesitos
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.pos_laudo_conclusoes_vigentes
  for all to authenticated using (true) with check (true);
