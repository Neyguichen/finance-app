-- Phase 9 — déduplication des liens Todo

create unique index if not exists todos_espace_object_unique_idx
  on public.todos (espace_id, object_type, object_id)
  where object_type is not null and object_id is not null;