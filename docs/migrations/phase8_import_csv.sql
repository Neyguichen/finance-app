-- Phase 8 — Import CSV
-- Applied to Supabase production project on 2026-09-29.
-- Additive migration: formats, import batches and batch items for safe history/undo.

create table if not exists public.import_formats (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  name text not null,
  delimiter text not null default ';',
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (espace_id, name)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  format_id uuid references public.import_formats(id) on delete set null,
  file_name text,
  status text not null default 'imported' check (status in ('imported','cancelled')),
  row_count integer not null default 0 check (row_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  matched_count integer not null default 0 check (matched_count >= 0),
  ignored_count integer not null default 0 check (ignored_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create table if not exists public.import_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_index integer not null check (row_index >= 0),
  nature text not null check (nature in ('expense','income','savings_internal','ignore')),
  action text not null check (action in ('created','matched','ignored','error')),
  target_table text,
  target_id uuid,
  before_state jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (batch_id, row_index)
);

-- RLS policies are ownership-based through espaces.user_id = auth.uid().
-- See the applied migration in Supabase for the active policy definitions.

-- Rollback (only if no import history must be preserved):
-- drop table if exists public.import_batch_items;
-- drop table if exists public.import_batches;
-- drop table if exists public.import_formats;
