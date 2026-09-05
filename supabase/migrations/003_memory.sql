-- ClaudeGPT Shared Memory V1
--
-- Storage is lossless. Retrieval is selective.
--
-- Raw messages remain untouched.
-- Embeddings are a replaceable search index over history.

create extension if not exists vector
with schema extensions;

create table message_embeddings (
  message_id uuid primary key
    references messages(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id),

  conversation_id uuid not null
    references conversations(id),

  embedding extensions.vector(1536) not null,

  embedding_model text not null,

  created_at timestamptz not null default now()
);

create index message_embeddings_user_id_idx
on message_embeddings(user_id);

create index message_embeddings_conversation_id_idx
on message_embeddings(conversation_id);

alter table message_embeddings enable row level security;

create policy "select own message embeddings"
on message_embeddings
for select
using (auth.uid() = user_id);

create policy "insert own message embeddings"
on message_embeddings
for insert
with check (auth.uid() = user_id);

create policy "update own message embeddings"
on message_embeddings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update
on message_embeddings
to authenticated;

create or replace function match_message_embeddings(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int,
  exclude_conversation_id uuid default null
)
returns table (
  message_id uuid,
  conversation_id uuid,
  role text,
  content text,
  provider text,
  model text,
  created_at timestamptz,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    m.id as message_id,
    m.conversation_id,
    m.role,
    m.content,
    m.provider,
    m.model,
    m.created_at,
    (
      1 - (
        me.embedding <=> query_embedding
      )
    )::float as similarity
  from message_embeddings me
  join messages m
    on m.id = me.message_id
  join conversations c
    on c.id = me.conversation_id
  where
    me.user_id = auth.uid()
    and c.user_id = auth.uid()
    and (
      exclude_conversation_id is null
      or me.conversation_id <>
        exclude_conversation_id
    )
    and (
      1 - (
        me.embedding <=> query_embedding
      )
    ) >= match_threshold
  order by
    me.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

grant execute
on function match_message_embeddings(
  extensions.vector,
  float,
  int,
  uuid
)
to authenticated;