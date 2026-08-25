-- ============================================================================
-- Storage: bucket para os laudos finais gerados (PDF + Word)
-- ============================================================================
-- Etapa "Geração do laudo" (Etapa 6 — versionamento). Bucket PRIVADO
-- (public = false), mesmo padrão de `documentos-processos`
-- (20260824090000): sem URL pública direta, sempre signed URL gerada no
-- servidor. Separado do bucket de documentos anexados de propósito — são
-- coisas semanticamente diferentes (documento FONTE que a perita anexa vs.
-- documento OUTPUT que o sistema gera), e mantém `storage_path` previsível
-- (`{processo_id}/v{versao}.pdf` / `.docx`).
--
-- A tabela `laudos_gerados` já existe desde o schema inicial
-- (20260821120000) e já tem RLS + policy de authenticated_full_access
-- (20260823100000) — só falta o bucket em si.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('laudos-gerados', 'laudos-gerados', false, 26214400) -- 25MB por arquivo
on conflict (id) do nothing;

create policy "authenticated_full_access_laudos_gerados"
  on storage.objects
  for all to authenticated
  using (bucket_id = 'laudos-gerados')
  with check (bucket_id = 'laudos-gerados');
