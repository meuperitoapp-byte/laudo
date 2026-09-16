-- ============================================================================
-- Central de Tarefas — responsável (item #1 da fila de melhorias, 19-20/09)
-- + status opcional pra Evento (item #3). Ver memória "redesign-visual-e-
-- fila-melhorias".
-- ============================================================================
-- `responsavel`: quem deve executar a tarefa/evento. Exemplo dela: a
-- secretária abre uma tarefa pra Dra. Fernanda revisar um caso; depois que
-- ela estuda, sinaliza a secretária pra agendar — ou seja, o responsável
-- MUDA ao longo do fluxo (é editável, não fixo no cadastro). `text` livre,
-- catálogo editável (mesmo padrão de Vara/Comarca/escritorio_indicacao) —
-- NÃO é referência a `auth.users`: a decisão maior de papéis/RLS (staffing)
-- continua em aberto (ver fluxo-principal-perito-judicial), e amarrar este
-- campo a uma tabela de usuários forçaria essa decisão a sair antes da
-- hora. Um campo de texto simples resolve o pedido de hoje sem inventar
-- estrutura que ninguém decidiu ainda.
--
-- `status` deixa de ser sempre obrigatório: continua obrigatório pra
-- tarefa, e passa a ser OPCIONAL pra evento — pedido dela explícito ("se
-- tiver como deixar opcional seria melhor"), porque o catálogo de status
-- (aguardando documentos, liberado pra agendar, etc.) é vocabulário de
-- TAREFA/serviço interno — não faz sentido obrigar numa perícia presencial
-- ou palestra.
-- ============================================================================

alter table public.central_tarefas
  add column responsavel text;

comment on column public.central_tarefas.responsavel is
  'Quem deve executar — texto livre, catálogo editável (mesmo padrão de Vara/Comarca). Muda ao longo do fluxo (ex.: secretária abre pra perita revisar, perita sinaliza secretária pra agendar) — não é referência a usuário, é rótulo livre.';

alter table public.central_tarefas
  alter column status drop not null;

alter table public.central_tarefas
  add constraint central_tarefas_status_obrigatorio_pra_tarefa
    check (tipo = 'evento' or status is not null);

comment on column public.central_tarefas.status is
  'Vocabulário LIVRE, sem CHECK de valores — editável por ela (semente no app: Aguardando documentos / Liberado para agendar / Agendado / Em estudo / Finalizado / Falar com advogado). Obrigatório só pra tipo=tarefa (CHECK central_tarefas_status_obrigatorio_pra_tarefa) — pra evento é opcional, porque esse vocabulário é de serviço interno, não de compromisso com hora marcada.';
