-- ALSH privé — mutualisation avec le moteur standard des créances
-- Applied to Supabase production project on 2026-10-01.
-- Le module ALSH reste privé/admin, mais chaque dossier peut être lié à une créance standard.

alter table public.remboursements_alsh
  add column if not exists espace_id uuid references public.espaces(id) on delete cascade,
  add column if not exists dette_id uuid references public.dettes(id) on delete set null;

create index if not exists remboursements_alsh_espace_id_idx
  on public.remboursements_alsh(espace_id);

create unique index if not exists remboursements_alsh_dette_id_unique_idx
  on public.remboursements_alsh(dette_id)
  where dette_id is not null;

comment on column public.remboursements_alsh.espace_id is
  'Budget auquel appartient ce suivi ALSH privé.';

comment on column public.remboursements_alsh.dette_id is
  'Créance standard liée au suivi ALSH; permet de mutualiser le moteur financier sans exposer les champs ALSH aux autres utilisateurs.';
