-- Phase 8 — Import CSV / annulation sûre
-- Applied to Supabase production project on 2026-09-29.
-- Stores the state left by an import so undo can refuse to delete/restore objects
-- that were modified later by the user.

alter table public.import_batch_items
  add column if not exists after_state jsonb;

comment on column public.import_batch_items.after_state is
  'Snapshot of the imported/matched target immediately after the batch action; used to refuse unsafe undo after later edits.';
