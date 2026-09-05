-- ClaudeGPT Projects

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id),
  name text not null,
  description text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "select own projects"
on projects for select
using (auth.uid() = user_id);

create policy "insert own projects"
on projects for insert
with check (auth.uid() = user_id);

create policy "update own projects"
on projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update
on projects
to authenticated;

alter table conversations
add column project_id uuid
references projects(id);

create index conversations_project_id_idx
on conversations(project_id);