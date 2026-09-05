-- ClaudeGPT Attachments V1
-- Original files are stored privately in Supabase Storage.
-- This table stores attachment metadata linked to messages.

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  message_id uuid not null
    references public.messages(id)
    on delete cascade,

  storage_bucket text not null default 'chat-attachments',
  storage_path text not null,

  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null
    check (size_bytes >= 0),

  created_at timestamptz not null default now(),

  unique (storage_bucket, storage_path)
);

create index if not exists message_attachments_message_id_idx
  on public.message_attachments(message_id);

create index if not exists message_attachments_conversation_id_idx
  on public.message_attachments(conversation_id);

create index if not exists message_attachments_user_id_idx
  on public.message_attachments(user_id);

alter table public.message_attachments enable row level security;

create policy "Users can read own attachments"
on public.message_attachments
for select
using (auth.uid() = user_id);

create policy "Users can insert own attachments"
on public.message_attachments
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.messages m
    join public.conversations c
      on c.id = m.conversation_id
    where m.id = message_id
      and m.conversation_id = conversation_id
      and c.user_id = auth.uid()
  )
);

-- Private storage bucket.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 20971520;

-- Storage paths must begin with the authenticated user's UUID:
-- <user-id>/<conversation-id>/<message-id>/<file>

create policy "Users can upload own chat attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own chat attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own chat attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users need table privileges in addition to RLS policies.
grant select, insert
on table public.message_attachments
to authenticated;
