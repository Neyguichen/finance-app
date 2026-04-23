export interface Compte {
  id: string;
  user_id: string;
  nom: string;
  type: 'courant' | 'epargne';
  created_at: string;
}

export interface Mois {
  id: string;
  user_id: string;
  compte_id: string;
  mois: string; // "2026-04-01"
}

export interface Revenu {
  id: string;
  mois_id: string;
  type: 'actif' | 'passif';
  nom: string;
  montant: number;
  recu: boolean;
  ordre: number;
}

export interface ChargeFixe {
  id: string;
  mois_id: string;
  nom: string;
  montant: number;
  payee: boolean;
  a_venir: boolean;
  ordre: number;
}

export interface Categorie {
  id: string;
  user_id: string;
  nom: string;
  icone: string | null;
  couleur: string;
  ordre: number;
}

export interface Budget {
  id: string;
  mois_id: string;
  categorie_id: string;
  prevu: number;
  categorie?: Categorie;
}

export interface Transaction {
  id: string;
  mois_id: string;
  categorie_id: string;
  date: string;
  montant: number;
  infos: string | null;
  categorie?: Categorie;
}

export interface Enveloppe {
  id: string;
  compte_id: string;
  nom: string;
  solde: number;
  objectif: number | null;
  ordre: number;
}

export interface MouvementEpargne {
  id: string;
  mois_id: string;
  enveloppe_source_id: string | null;
  enveloppe_dest_id: string | null;
  montant: number;
  type: 'alimentation' | 'reprise' | 'transfert';
  date: string;
  note: string | null;
}

export interface Evenement {
  id: string;
  mois_id: string;
  date: string | null;
  description: string;
}

export interface ResumeMensuel {
  mois_id: string;
  mois: string;
  compte_id: string;
  total_revenus_recus: number;
  total_revenus: number;
  total_actif: number;
  total_passif: number;
  total_charges_fixes: number;
  total_charges_payees: number;
  total_depenses: number;
  total_budgets_prevus: number;
  total_epargne_mois: number;
}

// Calculs dérivés
export function calcRestePrevu(r: ResumeMensuel): number {
  return (
    r.total_revenus -
    r.total_charges_fixes -
    r.total_budgets_prevus -
    r.total_epargne_mois
  );
}

export function calcResteReel(r: ResumeMensuel): number {
  return (
    r.total_revenus_recus -
    r.total_charges_payees -
    r.total_depenses -
    r.total_epargne_mois
  );
}

export function calcTotalSortants(r: ResumeMensuel): number {
  return r.total_charges_payees + r.total_depenses + r.total_epargne_mois;
}
