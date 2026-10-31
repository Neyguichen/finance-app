-- Phase 12 — Ignorer une occurrence prévue pour le mois
-- Migration additive appliquée sur Supabase le 31/10/2026.
-- L'occurrence reste en base et peut être réactivée ; la récurrence future n'est pas interrompue.

alter table public.revenus
  add column if not exists ignore_at timestamptz;

alter table public.charges_fixes
  add column if not exists ignore_at timestamptz;

alter table public.transactions
  add column if not exists ignore_at timestamptz;
