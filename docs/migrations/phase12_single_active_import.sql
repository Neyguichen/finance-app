-- Phase 12 — Only one active CSV import per Budget
-- Applied to production on 2026-10-02.

create unique index if not exists import_batches_one_reviewing_per_espace
on public.import_batches(espace_id)
where status = 'reviewing';
