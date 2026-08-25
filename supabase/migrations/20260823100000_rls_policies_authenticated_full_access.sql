-- ============================================================================
-- Políticas de RLS — acesso completo para usuários autenticados
-- ============================================================================
-- Etapa combinada nas migrations anteriores ("vamos fazer isso depois de
-- validar o schema") — chegou a hora: sem nenhuma política, todas as tabelas
-- ficam inacessíveis via API mesmo para usuários logados, e nenhuma tela
-- funciona (login, cadastro de processo, listagem).
--
-- Política adotada: qualquer usuário autenticado tem acesso total de
-- leitura/escrita em todas as tabelas do domínio. Justificativa (CLAUDE.md):
-- só existem 2 usuários (perita e secretária), sem necessidade de papéis
-- complexos nem de separação de dados entre eles — ambos trabalham nos
-- mesmos processos. `anon` (chave pública, sem sessão) continua sem nenhum
-- acesso, como já estava.
create policy "authenticated_full_access" on public.tipos_laudo
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.secoes
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.campos_secao
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.processos
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.documentos
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.respostas_processo
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.resposta_evidencias
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.respostas_reutilizaveis
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.quesitos
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on public.laudos_gerados
  for all to authenticated using (true) with check (true);
