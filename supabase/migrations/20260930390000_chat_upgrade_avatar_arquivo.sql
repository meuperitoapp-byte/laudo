-- ============================================================================
-- Chat interno — upgrade de UX (30/09/2026, print dela: "isso aí está muito
-- amador ainda"). Duas peças novas: foto de perfil por login (identidade
-- visual, começando pelo chat) e anexo de arquivo/documento na mensagem.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Foto de perfil — chave por e-mail, não por `perfil_usuarios` (a conta
-- original, que nunca passou pelo convite, também precisa de foto — mesmo
-- "grandfather rule" já documentado em lib/supabase/responsaveis.ts). Bucket
-- PÚBLICO: foto de perfil não é dado sensível, e evita reassinar URL a cada
-- mensagem renderizada no chat (potencialmente muitas por sessão).
-- ----------------------------------------------------------------------------
create table public.perfil_avatares (
  email         text primary key,
  storage_path  text not null,
  updated_at    timestamptz not null default now()
);
alter table public.perfil_avatares enable row level security;
create policy "perfil_avatares_full_access" on public.perfil_avatares
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatares', 'avatares', true, 5242880) -- 5MB — foto de perfil não precisa de mais
on conflict (id) do nothing;

create policy "authenticated_full_access_avatares" on storage.objects
  for all to authenticated using (bucket_id = 'avatares') with check (bucket_id = 'avatares');

-- ----------------------------------------------------------------------------
-- Anexo de arquivo na mensagem do chat — opcional, junto ou no lugar do
-- texto. Bucket PRIVADO (ao contrário do avatar, um anexo pode ser um
-- documento sensível de verdade) — URL assinada gerada na hora de exibir,
-- mesmo padrão já usado em `documentos`/`laudos_gerados`.
-- ----------------------------------------------------------------------------
alter table public.chat_mensagens alter column texto drop not null;
alter table public.chat_mensagens add column arquivo_path text;
alter table public.chat_mensagens add column arquivo_nome text;
alter table public.chat_mensagens add column arquivo_tipo text;
alter table public.chat_mensagens add column arquivo_tamanho_bytes bigint;
alter table public.chat_mensagens add constraint chat_mensagens_conteudo_check check (
  texto is not null or arquivo_path is not null
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-arquivos', 'chat-arquivos', false, 26214400) -- 25MB
on conflict (id) do nothing;

create policy "authenticated_full_access_chat_arquivos" on storage.objects
  for all to authenticated using (bucket_id = 'chat-arquivos') with check (bucket_id = 'chat-arquivos');
