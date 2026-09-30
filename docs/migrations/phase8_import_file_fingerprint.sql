-- Phase 8 — détection de réimport exact
-- Applied to Supabase production project.

alter table public.import_batches
  add column if not exists file_fingerprint text;

create index if not exists import_batches_espace_fingerprint_idx
  on public.import_batches (espace_id, file_fingerprint)
  where file_fingerprint is not null;

-- Le fingerprint sert uniquement à avertir/bloquer un réimport identique
-- jusqu’à confirmation explicite. Il ne crée pas de modèle de compte bancaire.