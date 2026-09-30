-- Phase 10 — Paramètres par Budget, onboarding et feedback
-- Additive migration.

alter table public.espaces
  add column if not exists features jsonb not null default '{"import_csv":true,"todo":true,"notifications":true}'::jsonb,
  add column if not exists onboarding_completed boolean not null default true;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  espace_id uuid references public.espaces(id) on delete set null,
  kind text not null check (kind in ('bug','suggestion')),
  title text not null,
  message text not null,
  status text not null default 'new' check (status in ('new','reviewed','closed')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_owner_select" on public.feedback;
create policy "feedback_owner_select" on public.feedback
for select using (user_id = auth.uid());

drop policy if exists "feedback_owner_insert" on public.feedback;
create policy "feedback_owner_insert" on public.feedback
for insert with check (
  user_id = auth.uid()
  and (
    espace_id is null
    or exists (
      select 1 from public.espaces e
      where e.id = feedback.espace_id and e.user_id = auth.uid()
    )
  )
);
