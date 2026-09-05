-- ClaudeGPT
-- Initial conversation storage.
--
-- Raw conversation history is the permanent source of truth.
-- Messages are append-only from the authenticated client.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references conversations(id),
  sequence bigint generated always as identity,
  role text not null
    check (role in ('user', 'assistant')),
  content text not null,
  provider text
    check (provider in ('openai', 'anthropic')),
  model text,
  created_at timestamptz not null default now()
);

create index messages_conversation_sequence_idx
on messages (conversation_id, sequence);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "select own conversations"
on conversations for select
using (auth.uid() = user_id);

create policy "insert own conversations"
on conversations for insert
with check (auth.uid() = user_id);

create policy "update own conversations"
on conversations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "select own messages"
on messages for select
using (
  exists (
    select 1
    from conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
  )
);

create policy "insert own messages"
on messages for insert
with check (
  exists (
    select 1
    from conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
  )
);

grant select, insert, update
on conversations
to authenticated;

grant select, insert
on messages
to authenticated;

grant usage, select
on sequence messages_sequence_seq
to authenticated;

create or replace function update_conversation_timestamp()
returns trigger
language plpgsql
as $$
begin
  update conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger update_conversation_on_message
after insert on messages
for each row
execute function update_conversation_timestamp();