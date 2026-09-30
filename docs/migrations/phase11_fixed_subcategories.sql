-- Phase 11 — sous-catégories des charges fixes
-- Migration additive appliquée sur Supabase le 30/09/2026.

alter table public.charges_fixes
  add column if not exists sous_categorie_id uuid references public.categories(id);

alter table public.charges_fixes_recurrentes
  add column if not exists sous_categorie_id uuid references public.categories(id);

create index if not exists charges_fixes_sous_categorie_idx
  on public.charges_fixes(sous_categorie_id);

create index if not exists charges_fixes_recurrentes_sous_categorie_idx
  on public.charges_fixes_recurrentes(sous_categorie_id);

-- prepare_month_v2 a également été mis à jour pour conserver
-- categorie_id + sous_categorie_id lors de la préparation/actualisation d'un mois.
