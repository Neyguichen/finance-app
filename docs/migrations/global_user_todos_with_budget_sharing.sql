-- Global user-scoped Todo with optional Budget sharing.
-- Personal tasks have espace_id = NULL and follow their owner across all Budgets.
-- A non-null espace_id means the owner explicitly shared the task with that Budget.

alter table public.todos
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

update public.todos t
set owner_user_id = e.user_id
from public.espaces e
where e.id = t.espace_id
  and t.owner_user_id is null;

alter table public.todos
  alter column owner_user_id set default auth.uid(),
  alter column owner_user_id set not null,
  alter column espace_id drop not null;

comment on column public.todos.owner_user_id is
  'User who owns the task. Personal tasks follow this user across all accessible Budgets.';

comment on column public.todos.espace_id is
  'Optional Budget used only to share the task. NULL means personal/private task.';

update public.todos
set espace_id = null;

drop index if exists public.todos_espace_object_unique_idx;
drop index if exists public.todos_espace_status_due_idx;

create unique index if not exists todos_owner_object_unique_idx
  on public.todos (owner_user_id, object_type, object_id)
  where object_type is not null and object_id is not null;

create index if not exists todos_owner_status_due_idx
  on public.todos (owner_user_id, status, due_date);

create index if not exists todos_shared_espace_idx
  on public.todos (espace_id)
  where espace_id is not null;

drop policy if exists todos_owner_all on public.todos;
drop policy if exists todos_select_visible on public.todos;
drop policy if exists todos_insert_owner on public.todos;
drop policy if exists todos_update_owner on public.todos;
drop policy if exists todos_delete_owner on public.todos;

create policy todos_select_visible
on public.todos
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or (
    espace_id is not null
    and exists (
      select 1
      from public.espaces e
      where e.id = todos.espace_id
    )
  )
);

create policy todos_insert_owner
on public.todos
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and (
    espace_id is null
    or exists (
      select 1
      from public.espaces e
      where e.id = todos.espace_id
    )
  )
);

create policy todos_update_owner
on public.todos
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (
  owner_user_id = (select auth.uid())
  and (
    espace_id is null
    or exists (
      select 1
      from public.espaces e
      where e.id = todos.espace_id
    )
  )
);

create policy todos_delete_owner
on public.todos
for delete
to authenticated
using (owner_user_id = (select auth.uid()));
