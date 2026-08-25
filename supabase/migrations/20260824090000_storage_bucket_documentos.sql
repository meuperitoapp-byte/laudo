-- ============================================================================
-- Storage: bucket para documentos/imagens anexados a processos
-- ============================================================================
-- Etapa "Documentos" (upload de documentos processuais e imagens da perícia,
-- CLAUDE.md > Fluxo aprovado, item 9). Bucket PRIVADO (public = false) — sem
-- URL pública direta; a aplicação sempre gera signed URL no servidor, com
-- sessão autenticada, pra exibir/baixar um arquivo. Dados médico-periciais
-- não devem ficar acessíveis por URL adivinhável.
--
-- RLS de storage.objects já vem habilitado por padrão no Supabase Storage
-- (não precisa de `alter table ... enable row level security`) — só falta a
-- policy, no mesmo espírito das demais tabelas do projeto (CLAUDE.md: só 2
-- usuárias, sem separação de dados entre elas — ver migration
-- 20260823100000_rls_policies_authenticated_full_access.sql).
--
-- Cobre tipo = 'documento_processual' e 'imagem_pericia' (documentos com
-- processo_id preenchido). Os assets globais da conta (assinatura_perito,
-- logomarca — documentos.processo_id null) ficam pra quando a tela de
-- Configurações for construída, mais adiante — sem bucket próprio ainda.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos-processos', 'documentos-processos', false, 26214400) -- 25MB por arquivo
on conflict (id) do nothing;

create policy "authenticated_full_access_documentos_processos"
  on storage.objects
  for all to authenticated
  using (bucket_id = 'documentos-processos')
  with check (bucket_id = 'documentos-processos');
