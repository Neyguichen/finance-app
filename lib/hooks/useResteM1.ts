'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useResteM1(espaceId: string | undefined, currentMonth: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reste_m1', espaceId, currentMonth],
    enabled: !!espaceId,
    queryFn: async () => {
      // 1. Récupérer TOUS les mois précédents (avant currentMonth)
      const { data: moisList } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId!)
        .lt('mois', currentMonth)

      if (!moisList || moisList.length === 0) return null

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
        supabase.from('transactions').select('montant').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('type, montant').in('mois_id', moisIds),
      ])

      // 3. Calculer le solde cumulé de tous les mois précédents
      const totalRevenus = (revenus || []).reduce((s, r) => s + Number(r.montant), 0)

      const totalReprises = (mouvements || [])
        .filter(m => m.type === 'reprise')
        .reduce((s, m) => s + Number(m.montant), 0)

      const totalEntrants = totalRevenus + totalReprises

      const totalChargesPayees = (charges || [])
        .filter(c => c.payee)
        .reduce((s, c) => s + Number(c.montant), 0)

      const totalDepenses = (transactions || []).reduce((s, t) => s + Number(t.montant), 0)

      const totalEpargnes = (mouvements || [])
        .filter(m => m.type === 'epargne')
        .reduce((s, m) => s + Number(m.montant), 0)

      // Solde cumulé = tout ce qui est entré - tout ce qui est sorti (payé/dépensé)
      return totalEntrants - totalChargesPayees - totalDepenses - totalEpargnes
    },
  })
}