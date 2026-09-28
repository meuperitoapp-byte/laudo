-- ============================================================================
-- Lote de melhorias (30/09/2026, prints da Dra. Fernanda):
-- 1) "Próxima ação" e "Prioridade" da Análise de Viabilidade viram catálogo
--    fechado, mesmo padrão já usado em Contestação/Estratégia Pericial —
--    hoje são texto livre, por isso o sistema não consegue "entender" a
--    ação registrada pra agir em cima dela.
-- 2) Chat interno ganha "Direcionar para" (§ pedido dela: "conversa com a
--    secretária é muito mais intensa que com o financeiro").
--
-- NOT VALID em ambos os CHECK novos — os valores já salvos hoje são texto
-- livre e quase certamente não batem com o catálogo fechado novo; NOT VALID
-- garante que a migration não falhe tentando validar histórico, e passa a
-- valer só a partir de agora (a tela em si já só vai deixar escolher valor
-- válido, então isso é rede de segurança, não bloqueio de dado antigo).
-- ============================================================================

alter table public.analises_viabilidade add constraint analises_viabilidade_proxima_acao_check check (
  proxima_acao is null or proxima_acao in (
    'agendar_reuniao_apresentacao', 'solicitar_documentos', 'aguardar_retorno_cliente',
    'elaborar_enviar_orcamento', 'revisar_analise', 'consultar_especialista',
    'finalizar_registrar_conclusao', 'outro'
  )
) not valid;

alter table public.analises_viabilidade add constraint analises_viabilidade_proxima_acao_prioridade_check check (
  proxima_acao_prioridade is null or proxima_acao_prioridade in ('normal', 'alta', 'urgente')
) not valid;

-- "Responsável" da próxima ação e "responsável" das outras listas da
-- Viabilidade (documentos faltantes, fragilidades, oportunidades
-- probatórias) e da Central de Prazos (Tarefa/Evento) já eram `text` livre
-- sem CHECK — não precisam de migration, só troca de componente na tela
-- (ComboboxCatalogo/input -> SelectResponsavel), pra usar os logins reais
-- em vez do catálogo fixo antigo (Dra. Fernanda/Secretária/CEO/Financeiro/
-- Assessor/Atendimento).

-- ----------------------------------------------------------------------------
-- Chat interno — "Direcionar para" (opcional). Continua sala única, todo
-- mundo vê tudo (ninguém perde a visão geral) — só marca visualmente que a
-- mensagem é voltada a alguém específico, e permite filtrar "só minhas
-- menções". Sem CHECK: a lista de nomes válidos é dinâmica (perfil_usuarios),
-- validada na aplicação, mesmo princípio de central_tarefas.responsavel.
-- ----------------------------------------------------------------------------
alter table public.chat_mensagens add column mencionado_nome text;
comment on column public.chat_mensagens.mencionado_nome is
  'Nome de exibição de quem a mensagem é dirigida (opcional) — sala continua única, isso só marca/filtra visualmente.';
