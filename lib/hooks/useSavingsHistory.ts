'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MouvementEpargne } from '@/lib/types'

export type SavingsHistoryPoint = {
  month: string
  label: string
  net: number
}

export function useSavingsHistory(espaceId?: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['savings_history', espaceId],
    enabled: !!espaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)
        .order('mois')
      if (monthsError) throw monthsError
      if (!months?.length) return { movements: [] as Array<MouvementEpargne & { month: string }>, months: [] as SavingsHistoryPoint[] }

      const ids = months.map(month => month.id)
      const monthMap = new Map(months.map(month => [month.id, String(month.mois).slice(0, 7)]))
      const { data: movements, error } = await supabase
        .from('mouvements_epargne')
        .select('*')
        .in('mois_id', ids)
        .order('date', { ascending: true })
      if (error) throw error

      const enriched = (movements || []).map(movement => ({
        ...(movement as MouvementEpargne),
        month: monthMap.get(movement.mois_id) || String(movement.date).slice(0, 7),
      }))

      const monthly = new Map<string, number>()
      for (const item of enriched) {
        let signed = 0
        if (item.type === 'epargne') signed = Number(item.montant)
        if (item.type === 'reprise') signed = -Number(item.montant)
        monthly.set(item.month, (monthly.get(item.month) || 0) + signed)
      }

      const points = Array.from(monthly.entries())
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([month, net]) => {
          const d = new Date(month + '-01T12:00:00')
          return { month, net, label: d.toLocaleDateString('fr-FR', { month:'short', year:'2-digit' }) }
        })

      return { movements: enriched, months: points }
    },
  })
}
