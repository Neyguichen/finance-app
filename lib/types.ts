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

export interface Revenu {
  id: string
  mois_id: string
  type: 'actif' | 'passif'
  nom: string
  montant: number
  recu: boolean
  ordre: number
}

export interface ChargeFixe {
  id: string
  mois_id: string
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

export interface Enveloppe {
  id: string
  espace_id: string
  nom: string
  solde: number
  objectif: number | null
  ordre: number
}

export interface MouvementEpargne {
  id: string
  mois_id: string
  enveloppe_source_id: string | null
  enveloppe_dest_id: string | null
  montant: number
  type: 'alimentation' | 'reprise' | 'transfert'
  date: string
  note: string | null
}