'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Enveloppe } from '@/lib/types'

export function useEnveloppesAtMonth(espaceId: string | undefined, month: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['enveloppes_at_month', espaceId, month],
    enabled: !!espaceId,
    queryFn: async () => {
      // Les enveloppes et la liste des mois sont indépendantes : les charger en parallèle
      // évite un aller-retour réseau inutile sur le dashboard.
      const [
        { data: enveloppes, error: envErr },
        { data: moisList, error: moisErr },
      ] = await Promise.all([
        supabase
          .from('enveloppes')
          .select('*')
          .eq('espace_id', espaceId!)
          .order('ordre'),
        supabase
          .from('mois')
          .select('id')
          .eq('espace_id', espaceId!)
          .lte('mois', month),
      ])
      if (envErr) throw envErr
      if (moisErr) throw moisErr

      const moisIds = (moisList || []).map(m => m.id)

      // Aucun mois préparé : une référence d'épargne reste un stock lisible,
      // sinon on conserve le comportement historique basé sur solde_initial.
      if (moisIds.length === 0) {
        return (enveloppes || []).map(e => ({
          ...e,
          solde: e.solde_reference != null
            ? Number(e.solde_reference)
            : Number(e.solde_initial || 0),
        })) as Enveloppe[]
      }

      // 3. Charger tous les mouvements jusqu'à ce mois
      const { data: mouvements, error: mvtErr } = await supabase
        .from('mouvements_epargne')
        .select('*')
        .in('mois_id', moisIds)
      if (mvtErr) throw mvtErr

      const targetMonthEnd = new Date(`${month}T12:00:00`)
      targetMonthEnd.setMonth(targetMonthEnd.getMonth() + 1)
      targetMonthEnd.setDate(0)
      const targetEnd = targetMonthEnd.toISOString().slice(0, 10)

      const allMovements = mouvements || []

      return (enveloppes || []).map(e => {
        const referenceDate = e.date_solde_reference || null
        const canUseReference = e.solde_reference != null && referenceDate && targetEnd >= referenceDate
        let balance = canUseReference
          ? Number(e.solde_reference)
          : Number(e.solde_initial || 0)

        for (const mvt of allMovements) {
          const movementDate = String(mvt.date || '')
          if (!movementDate || movementDate > targetEnd) continue
          if (canUseReference && movementDate <= referenceDate!) continue

          if (mvt.type === 'epargne' && mvt.enveloppe_dest_id === e.id) {
            balance += Number(mvt.montant)
          } else if (mvt.type === 'reprise' && mvt.enveloppe_source_id === e.id) {
            balance -= Number(mvt.montant)
          } else if (mvt.type === 'transfert') {
            if (mvt.enveloppe_source_id === e.id) balance -= Number(mvt.montant)
            if (mvt.enveloppe_dest_id === e.id) balance += Number(mvt.montant)
          }
        }

        return { ...e, solde: balance }
      }) as Enveloppe[]
    },
  })
}