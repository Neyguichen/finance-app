-- Phase 12 — Historical migration, superseded on 2026-10-02
-- This unique index was initially introduced to restrict a Budget to one reviewing import.
-- Product decision changed the same day: multiple import lots may feed one global validation queue.
-- See phase12_allow_multiple_reviewing_imports.sql.

create unique index if not exists import_batches_one_reviewing_per_espace
on public.import_batches(espace_id)
where status = 'reviewing';
