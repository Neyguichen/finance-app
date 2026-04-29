'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useResteM1(espaceId: string | undefined, currentMonth: string, soldeInitial: number = 0) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reste_m1', espaceId, currentMonth, soldeInitial],
    enabled: !!espaceId,
    queryFn: async () => {
      // 1. Récupérer TOUS les mois précédents
      const { data: moisList } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId!)
        .lt('mois', currentMonth)

      if (!moisList || moisList.length === 0) {
        // Aucun mois précédent → le solde initial est le reste M-1
        return soldeInitial !== 0 ? soldeInitial : null
      }

      const moisIds = moisList.map(m => m.id)

      // 2. Requêter toutes les données en parallèle
      const [
        { data: revenus = [] },
        { data: charges = [] },
        { data: transactions = [] },
        { data: mouvements = [] },
      ] = await Promise.all([
        supabase.from('revenus').select('montant').in('mois_id', moisIds),
        supabase.from('charges_fixes').select('montant, payee').in('mois_id', moisIds),
        supabase.from('transactions').select('montant, remboursements(montant)').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('type, montant').in('mois_id', moisIds),
      ])

      // 3. Calculer le solde cumulé
      const totalRevenus = (revenus || []).reduce((s, r) => s + Number(r.montant), 0)

      const totalReprises = (mouvements || [])
        .filter(m => m.type === 'reprise')
        .reduce((s, m) => s + Number(m.montant), 0)

      const totalEntrants = totalRevenus + totalReprises

      // Charges PAYÉES uniquement (comme le dashboard)
      const totalChargesPayees = (charges || [])
        .filter((c: any) => c.payee)
        .reduce((s, c) => s + Number(c.montant), 0)

      // Dépenses NETTES (montant - remboursements)
      const totalDepenses = (transactions || []).reduce((s, t: any) => {
        const rembs = t.remboursements || []
        const totalRemb = rembs.reduce((sr: number, r: any) => sr + Number(r.montant), 0)
        return s + Number(t.montant) - totalRemb
      }, 0)

      const totalEpargnes = (mouvements || [])
        .filter(m => m.type === 'epargne')
        .reduce((s, m) => s + Number(m.montant), 0)

      // Formule : solde_initial + cumul des mois précédents
      return soldeInitial + totalEntrants - totalChargesPayees - totalDepenses - totalEpargnes
    },
  })
}