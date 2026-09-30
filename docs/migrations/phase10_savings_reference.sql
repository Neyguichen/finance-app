-- Phase 10 — Référence d'épargne par enveloppe
-- Migration additive : ajoute un stock de référence daté sans créer de mouvement.

alter table public.enveloppes
  add column if not exists solde_reference numeric,
  add column if not exists date_solde_reference date;

comment on column public.enveloppes.solde_reference is
  'V2 savings stock anchor for this envelope. Not a financial movement.';

comment on column public.enveloppes.date_solde_reference is
  'Date of the verified savings stock anchor. Movements strictly after this date modify the reference balance.';

-- Rollback non destructif possible tant qu'aucune référence V2 n'est nécessaire :
-- alter table public.enveloppes drop column if exists date_solde_reference;
-- alter table public.enveloppes drop column if exists solde_reference;
