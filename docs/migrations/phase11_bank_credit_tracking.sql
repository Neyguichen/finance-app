alter table public.dettes
  add column if not exists mode text not null default 'simple'
    check (mode in ('simple','credit')),
  add column if not exists taux_annuel numeric,
  add column if not exists mensualite numeric,
  add column if not exists assurance_mensuelle numeric,
  add column if not exists date_debut date,
  add column if not exists duree_mois integer;

alter table public.remboursements_dette
  add column if not exists capital_rembourse numeric;

comment on column public.dettes.mode is
  'simple = dette/créance classique, credit = crédit bancaire amortissable';
comment on column public.dettes.taux_annuel is
  'Taux nominal annuel du crédit bancaire en pourcentage.';
comment on column public.dettes.mensualite is
  'Mensualité contractuelle hors assurance si renseignée séparément.';
comment on column public.dettes.assurance_mensuelle is
  'Montant mensuel facultatif de l’assurance emprunteur.';
comment on column public.dettes.date_debut is
  'Date de début du crédit bancaire.';
comment on column public.dettes.duree_mois is
  'Durée contractuelle du crédit en mois.';
comment on column public.remboursements_dette.capital_rembourse is
  'Part du remboursement qui réduit réellement le capital restant dû pour un crédit bancaire.';
