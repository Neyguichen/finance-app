-- Phase 9 — Todo & Notifications
-- Additive migration for lightweight actions and the internal notification center.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','done')),
  due_date date,
  note text,
  link_label text,
  link_href text,
  object_type text,
  object_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists todos_espace_status_due_idx
  on public.todos (espace_id, status, due_date);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  family text not null default 'neyguichen' check (family in ('finances','actions','neyguichen')),
  title text not null,
  message text,
  action_label text,
  action_href text,
  dedupe_key text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_espace_dedupe_idx
  on public.notifications (espace_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_espace_active_idx
  on public.notifications (espace_id, archived_at, read_at, created_at desc);

alter table public.todos enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "todos_owner_all" on public.todos;
create policy "todos_owner_all" on public.todos
for all using (
  exists (
    select 1 from public.espaces e
    where e.id = todos.espace_id and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.espaces e
    where e.id = todos.espace_id and e.user_id = auth.uid()
  )
);

drop policy if exists "notifications_owner_all" on public.notifications;
create policy "notifications_owner_all" on public.notifications
for all using (
  exists (
    select 1 from public.espaces e
    where e.id = notifications.espace_id and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.espaces e
    where e.id = notifications.espace_id and e.user_id = auth.uid()
  )
);

-- Rollback (only if no Todo/notification data needs to be preserved):
-- drop table if exists public.notifications;
-- drop table if exists public.todos;
