-- ============================================================================
-- Atualizações do sistema (24/09/2026) — sino de notificações no topo,
-- pedido do Jeferson: listar as melhorias/atualizações feitas pra Dra.
-- Fernanda (e a equipe) ficarem cientes sem precisar perguntar.
--
-- Sem tabela de "lido por usuário" — só 2-3 pessoas usam o sistema (CLAUDE.md:
-- "sem necessidade de sistema de papéis complexo") e o estado de "já vi" é
-- puramente de conveniência de cada navegador, não precisa sincronizar entre
-- dispositivos nem sobreviver a limpar o navegador. Guardado em localStorage
-- no client (ver notificacoes-sino.tsx), não no banco.
-- ============================================================================

create table public.atualizacoes_sistema (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text,
  created_at  timestamptz not null default now()
);

comment on table public.atualizacoes_sistema is
  'Changelog exibido no sino de notificações do topo — atualizações/melhorias do sistema, em linguagem simples pra Dra. Fernanda/equipe, não changelog técnico.';

alter table public.atualizacoes_sistema enable row level security;
create policy "atualizacoes_sistema_full_access" on public.atualizacoes_sistema
  for all to authenticated using (true) with check (true);

-- Semente inicial — destaques das últimas entregas (24/09/2026), em
-- linguagem simples. Daqui pra frente, cada entrega notável nova ganha uma
-- linha aqui (inserida junto com a migration da própria entrega).
insert into public.atualizacoes_sistema (titulo, descricao, created_at) values
  ('5 janelas novas: Contestação, Réplica, Quesitos, Relatório Técnico e Estratégia Pericial',
   'Cada uma virou uma tela própria dentro do processo, seguindo os modelos que você enviou — com geração de PDF/Word.',
   '2026-09-24 18:00:00-03'),
  ('Atestado e Declaração médico-pericial',
   'Nova tela pra preencher e gerar o Atestado ou a Declaração em PDF/Word, com os modelos de conclusão do documento que você mandou.',
   '2026-09-24 12:00:00-03'),
  ('Chat interno da equipe',
   'Uma sala de conversa em tempo real entre quem usa o sistema, direto no menu "Chat".',
   '2026-09-24 08:00:00-03'),
  ('Demonstrativo financeiro da Assistência Técnica',
   'A tela Financeiro agora também mostra valores a receber e já recebidos da Assistência Técnica, ao lado do que já existia da Perícia Judicial.',
   '2026-09-24 06:00:00-03'),
  ('Perfis de acesso da equipe',
   'Agora dá pra convidar cada pessoa da equipe com um login próprio, mostrando só os módulos que fazem sentido pra função dela.',
   '2026-09-23 18:00:00-03'),
  ('Análise de Viabilidade Técnico-Pericial completa',
   'Módulo inteiro, do cadastro das informações do caso até a geração do PDF/Word final.',
   '2026-09-23 12:00:00-03'),
  ('Financeiro — movimentações',
   'Entradas e saídas de dinheiro reunidas num só lugar, sempre vinculadas ao processo correspondente.',
   '2026-09-23 08:00:00-03'),
  ('Novas categorias de documento: Orçamento e Contrato',
   'Pra organizar melhor os arquivos anexados em processos de Assistência Técnica.',
   '2026-09-21 12:00:00-03')
on conflict do nothing;
