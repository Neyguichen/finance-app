'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useAvailableYears(espaceId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['available_years', espaceId],
    enabled: !!espaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Récupérer tous les mois de l'espace
      const { data: moisList } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)

      if (!moisList || moisList.length === 0) return []

      const moisIds = moisList.map(m => m.id)

      // Vérifier quels mois ont au moins une donnée
      const [rev, chg, txn, mvt] = await Promise.all([
        supabase.from('revenus').select('mois_id').in('mois_id', moisIds),
        supabase.from('charges_fixes').select('mois_id').in('mois_id', moisIds),
        supabase.from('transactions').select('mois_id').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('mois_id').in('mois_id', moisIds),
      ])

      // Collecter les mois_id qui ont au moins 1 entrée
      const activeMoisIds = new Set<string>()
      for (const r of (rev.data || [])) activeMoisIds.add(r.mois_id)
      for (const c of (chg.data || [])) activeMoisIds.add(c.mois_id)
      for (const t of (txn.data || [])) activeMoisIds.add(t.mois_id)
      for (const m of (mvt.data || [])) activeMoisIds.add(m.mois_id)

      // Extraire les années avec données
      const activeYears = new Set<string>()
      for (const m of moisList) {
        if (activeMoisIds.has(m.id)) {
          activeYears.add(m.mois.slice(0, 4))
        }
      }

      return Array.from(activeYears).sort((a, b) => b.localeCompare(a))
    },
  })
}