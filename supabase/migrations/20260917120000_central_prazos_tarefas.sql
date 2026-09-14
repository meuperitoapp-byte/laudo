-- ============================================================================
-- Central de Gestão de Prazos e Tarefas — fatia 2: cadastro manual de
-- tarefa/evento avulso. Ver docs/plano-modulo-central-prazos.md.
-- ============================================================================
-- Primeira tabela nova do módulo (fatia 1 era só leitura sobre o que já
-- existia). Uma tabela só, com `tipo` discriminando evento × tarefa — mesmo
-- padrão de `laudos_gerados.tipo`/`pos_laudo_ciclos.fluxo` — não duas
-- tabelas: os dois compartilham status, urgência e vínculo opcional com
-- processo, e precisam da MESMA régua de urgência pra entrar juntos no
-- painel `/hoje`. A separação que a Dra. Fernanda confirmou duas vezes
-- ("compromisso com hora marcada entra separado de tarefa com data-limite")
-- vira uma trava estrutural: `hora` só existe pra evento (CHECK abaixo), e a
-- tela de cadastro pergunta "Evento ou Tarefa?" antes de mostrar o
-- formulário certo — nunca um campo de hora "opcional" pendurado numa tarefa.
--
-- `processo_id` é NULLABLE de propósito: "tarefa avulsa" no requisito
-- original dela inclui coisas sem processo específico (ex.: renovar CRM).
--
-- `status` é `text` livre, SEM CHECK — vocabulário editável por ela (pediu
-- explicitamente pra não ficar travado em código, e perguntou se pode
-- cadastrar outros depois). Mesmo padrão já usado em Vara/Comarca
-- (`ComboboxCatalogo` + `mesclarSugestoes`, ver src/features/processos/
-- catalogos.ts): a semente ("Aguardando documentos", "Em estudo", "Em
-- execução", "Aguardando agendamento") mora no código do app, não no banco
-- — o catálogo cresce sozinho com os valores distintos já usados aqui.
--
-- `status_alterado_em`: quando o status ATUAL começou a valer. Gravado pela
-- aplicação (não trigger) toda vez que `status` muda — mesmo critério
-- app-layer já usado em `entregue_ao_advogado_em`/`liberacao_solicitada_em`.
-- É o dado que faltava pra "há quantos dias está nesse estado" (achado desta
-- sessão: nenhuma coluna do sistema tinha isso até agora) — mesmo sem uso
-- ainda na fatia 2, já nasce certo porque a fatia 3 (documentos pendentes)
-- vai precisar do mesmo raciocínio.
--
-- `nivel_urgencia_manual`: a correção dela, quando presente, VENCE o cálculo
-- automático (`nivelPorPrazo` sobre `data`) — nunca o contrário. Nullable =
-- "sem correção, usa o cálculo".
--
-- `concluida_em`: separado de `status` de propósito — status é ONDE a
-- tarefa está no fluxo dela (vocabulário livre, o sistema não sabe qual
-- valor "significa terminado"); concluída é SE ela já resolveu, fato
-- explícito, nunca inferido de nenhum valor de status. Sem isso, tarefa
-- resolvida continuaria aparecendo pra sempre no painel.
-- ============================================================================

create table public.central_tarefas (
  id                     uuid primary key default gen_random_uuid(),
  -- null = tarefa avulsa, sem processo específico (ex.: "renovar CRM").
  processo_id            uuid references public.processos(id) on delete cascade,
  tipo                   text not null
                           check (tipo in ('tarefa', 'evento')),
  titulo                 text not null,
  descricao              text,
  -- Tarefa: data-limite (prazo). Evento: data do compromisso.
  data                   date not null,
  -- Só evento tem horário — CHECK abaixo garante a separação estrutural.
  hora                   time,
  status                 text not null,
  status_alterado_em     timestamptz not null default now(),
  nivel_urgencia_manual  text
                           check (nivel_urgencia_manual in ('critica', 'urgente', 'alta',
                                                            'atencao', 'programada', 'sem_prazo')),
  concluida_em           timestamptz,
  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  check ((tipo = 'evento' and hora is not null) or (tipo = 'tarefa' and hora is null))
);

comment on table public.central_tarefas is
  'Cadastro manual de tarefa/evento avulso (fatia 2 da Central de Prazos) — só existe o que ela cadastra aqui; nada é criado automaticamente por outra parte do sistema.';
comment on column public.central_tarefas.processo_id is
  'Null = tarefa avulsa, sem processo específico.';
comment on column public.central_tarefas.tipo is
  '''tarefa'' (data-limite) ou ''evento'' (hora marcada) — distinção estrutural pedida pela Dra. Fernanda, confirmada duas vezes. Nunca o mesmo campo de data serve pros dois sentidos.';
comment on column public.central_tarefas.status is
  'Vocabulário LIVRE, sem CHECK — editável por ela (semente no app: Aguardando documentos / Em estudo / Em execução / Aguardando agendamento, mesmo padrão de Vara/Comarca). O sistema não atribui significado a nenhum valor específico.';
comment on column public.central_tarefas.status_alterado_em is
  'Desde quando o status ATUAL vale — gravado pela aplicação a cada mudança de status, nunca por trigger. Base pra "há quantos dias está pendente".';
comment on column public.central_tarefas.nivel_urgencia_manual is
  'Correção manual do nível de urgência calculado — quando preenchida, SEMPRE vence o cálculo automático (nunca o contrário). Null = usa o cálculo sobre `data`.';
comment on column public.central_tarefas.concluida_em is
  'Fato explícito de que ela marcou como resolvida — independente do valor de `status` (o sistema não infere "concluída" de nenhum texto de status). Null = ainda pendente.';

create trigger trg_set_updated_at
  before update on public.central_tarefas
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — mesmo padrão do resto do schema (2 perfis, ambos com acesso total).
-- ============================================================================
alter table public.central_tarefas enable row level security;

create policy "authenticated_full_access" on public.central_tarefas
  for all to authenticated using (true) with check (true);
