'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useResteM1(espaceId: string | undefined, currentMonth: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reste_m1', espaceId, currentMonth],
    enabled: !!espaceId,
    queryFn: async () => {
      // Calculer le mois précédent (en local, pas UTC)
      const moisDate = new Date(currentMonth + 'T00:00:00')
      const prevY = moisDate.getFullYear()
      const prevM = moisDate.getMonth()
      const prevMoisDate = new Date(prevY, prevM - 1, 1)
      const prevMoisStr = [
        prevMoisDate.getFullYear(),
        String(prevMoisDate.getMonth() + 1).padStart(2, '0'),
        '01'
      ].join('-')

      // Trouver le mois précédent en BDD
      const { data: prevMois } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId!)
        .eq('mois', prevMoisStr)
        .single()

      if (!prevMois) return null // Pas de mois précédent → pas de reste M-1

      const prevMoisId = prevMois.id

      // Revenus du mois précédent
      const { data: revenus = [] } = await supabase
        .from('revenus')
        .select('type, montant')
        .eq('mois_id', prevMoisId)

      const totalRevenus = (revenus || []).reduce((s, r) => s + Number(r.montant), 0)

      // Reprises épargne du mois précédent (= entrées)
      const { data: mouvements = [] } = await supabase
        .from('mouvements_epargne')
        .select('type, montant')
        .eq('mois_id', prevMoisId)

      const totalReprises = (mouvements || [])
        .filter(m => m.type === 'reprise')
        .reduce((s, m) => s + Number(m.montant), 0)

      const totalEntrants = totalRevenus + totalReprises

      // Charges fixes payées du mois précédent
      const { data: charges = [] } = await supabase
        .from('charges_fixes')
        .select('montant, payee')
        .eq('mois_id', prevMoisId)

      const totalChargesPayees = (charges || [])
        .filter(c => c.payee)
        .reduce((s, c) => s + Number(c.montant), 0)

      // Dépenses variables du mois précédent
      const { data: transactions = [] } = await supabase
        .from('transactions')
        .select('montant')
        .eq('mois_id', prevMoisId)

      const totalDepenses = (transactions || []).reduce((s, t) => s + Number(t.montant), 0)

      // Épargne (sorties) du mois précédent
      const totalEpargnes = (mouvements || [])
        .filter(m => m.type === 'epargne')
        .reduce((s, m) => s + Number(m.montant), 0)

      // Reste Réel M-1 = Entrants - Charges payées - Dépenses - Épargne
      const resteReelM1 = totalEntrants - totalChargesPayees - totalDepenses - totalEpargnes

      return resteReelM1
    },
  })
}