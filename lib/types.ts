export interface Espace {
  id: string
  user_id: string
  nom: string
  icone: string
  ordre: number
  created_at: string
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
  ordre: number
}

export interface ChargeFixeRecurrente {
  id: string
  espace_id: string
  nom: string
  montant: number
  actif: boolean
  frequence_mois: number  // 1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel
  ordre: number
  created_at: string
}

export interface ChargeFixe {
  id: string
  mois_id: string
  recurrent_id: string | null
  nom: string
  montant: number
  payee: boolean
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
  date: string
  montant: number
  infos: string | null
  categorie?: Categorie
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
  objectif: number | null
  ordre: number
}

export interface EpargneRecurrente {
  id: string
  espace_id: string
  enveloppe_dest_id: string
  montant: number
  actif: boolean
  frequence_mois: number  // 1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel
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
  type: 'alimentation' | 'reprise' | 'transfert'
  date: string
  note: string | null
}

// Evenement et ResumeMensuel supprimés en v2