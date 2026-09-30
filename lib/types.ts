export interface Espace {
  id: string
  user_id: string
  nom: string
  icone: string
  ordre: number
  solde_initial: number
  /** Solde réel vérifié à une date donnée (moteur V2). */
  solde_reference?: number | null
  /** Date ISO YYYY-MM-DD associée au solde de référence V2. */
  date_solde_reference?: string | null
  created_at: string
  double_date?: boolean
  dashboard_stats?: Record<string, boolean>
  features?: {
    import_csv?: boolean
    todo?: boolean
    notifications?: boolean
  }
  onboarding_completed?: boolean
}

export interface Mois {
  id: string
  user_id: string
  espace_id: string
  mois: string
}

export interface RevenuRecurrent {
  id: string
  espace_id: string
  type: 'actif' | 'passif'
  nom: string
  montant: number
  actif: boolean
  frequence_mois: number  // 1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel
  mois_debut: string | null
  ordre: number
  created_at: string
}

export interface Revenu {
  id: string
  mois_id: string
  recurrent_id: string | null
  type: 'actif' | 'passif'
  nom: string
  montant: number
  recu: boolean
  date_prevue?: string | null
  date_reelle?: string | null
  ordre: number
}

export interface ChargeFixeRecurrente {
  id: string
  espace_id: string
  nom: string
  montant: number
  categorie_id?: string | null
  actif: boolean
  frequence_mois: number  // 1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel
  mois_debut: string | null
  ordre: number
  created_at: string
}

export interface ChargeFixe {
  id: string
  mois_id: string
  recurrent_id: string | null
  nom: string
  montant: number
  montant_reel?: number | null
  categorie_id?: string | null
  payee: boolean
  date_prevue?: string | null
  date_reelle?: string | null
  ordre: number
}

export interface Categorie {
  id: string
  espace_id: string
  nom: string
  icone: string | null
  couleur: string
  ordre: number
  actif?: boolean
  parent_id?: string | null
}

export interface Budget {
  id: string
  mois_id: string
  categorie_id: string
  prevu: number
  categorie?: Categorie
}

export interface Transaction {
  id: string
  mois_id: string
  categorie_id: string
  sous_categorie_id?: string | null
  date: string
  /** V2: en mode standard, date de validation; en mode double date, date de débit bancaire. */
  date_validation?: string | null
  montant: number
  infos: string | null
  categorie?: Categorie
  sous_categorie?: Categorie | null
  parent_transaction_id?: string | null
  is_split?: boolean
  children?: Transaction[]
}

export interface Remboursement {
  id: string
  transaction_id: string
  montant: number
  note: string | null
  date: string
  created_at?: string
}

export interface Enveloppe {
  id: string
  espace_id: string
  nom: string
  solde: number
  solde_initial: number
  solde_reference?: number | null
  date_solde_reference?: string | null
  objectif: number | null
  ordre: number
  archived: boolean
}

export interface EpargneRecurrente {
  id: string
  espace_id: string
  enveloppe_dest_id: string
  montant: number
  actif: boolean
  frequence_mois: number  // 1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel
  mois_debut: string | null
  note: string | null
  ordre: number
  created_at: string
}

export interface MouvementEpargne {
  id: string
  mois_id: string
  recurrent_id: string | null
  enveloppe_source_id: string | null
  enveloppe_dest_id: string | null
  montant: number
  type: 'epargne' | 'reprise' | 'transfert'
  date: string
  note: string | null
}

export interface Dette {
  id: string
  espace_id: string
  type: 'je_dois' | 'jai_prete'
  titre: string
  description: string | null
  personne: string
  montant: number
  date_echeance: string | null
  archived: boolean
  created_at: string
}

export interface RemboursementDette {
  id: string
  dette_id: string
  montant: number
  date: string
  note: string | null
  /** V2: ce remboursement correspond réellement à un flux du Budget. */
  impacte_budget?: boolean
  created_at: string
}

export interface RemboursementAlsh {
  id: string
  user_id: string
  lien_facture: string | null
  periode_debut: string
  periode_fin: string
  date_paiement: string | null
  date_partage_audrey: string | null
  statut: 'a_transmettre' | 'transmis' | 'rembourse' | 'vire_cj'
  montant: number | null
  note: string | null
  created_at: string
}