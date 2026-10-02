-- Phase 12 — Persistent CSV import review
-- Applied to production on 2026-10-02.

alter table public.import_batches
  drop constraint if exists import_batches_status_check;

alter table public.import_batches
  add constraint import_batches_status_check
  check (status in ('reviewing','completed','cancelled'));

alter table public.import_batch_items
  drop constraint if exists import_batch_items_action_check;

alter table public.import_batch_items
  add constraint import_batch_items_action_check
  check (action in ('pending','created','matched','ignored','error'));

alter table public.import_batch_items
  add column if not exists reviewed_at timestamptz;

comment on column public.import_batch_items.reviewed_at is
  'Date at which a staged CSV row was validated, matched, ignored or converted into an accounting object.';
