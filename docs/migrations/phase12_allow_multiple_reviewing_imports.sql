-- Phase 12 — Multiple import lots feeding one global review queue
-- Applied to production on 2026-10-02.

drop index if exists public.import_batches_one_reviewing_per_espace;
