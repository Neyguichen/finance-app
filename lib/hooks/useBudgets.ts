'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Budget } from '@/lib/types'

export function useBudgets(moisId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['budgets', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categorie:categories(*)')
        .eq('mois_id', moisId!)
      if (error) throw error
      return data as Budget[]
    },
  })

  const upsert = useMutation({
    mutationFn: async ({ mois_id, categorie_id, prevu }: { mois_id: string; categorie_id: string; prevu: number }) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ mois_id, categorie_id, prevu }, { onConflict: 'mois_id,categorie_id' })
        .select('*, categorie:categories(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const copyFromPrevious = useMutation({
    mutationFn: async ({ espace_id, currentMonth }: { espace_id: string; currentMonth: string }) => {
      // Trouver le mois le plus récent AVANT le mois actuel (format-agnostic)
      const { data: prevMoisRec } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espace_id)
        .lt('mois', currentMonth)
        .order('mois', { ascending: false })
        .limit(1)
        .single()
      if (!prevMoisRec) throw new Error('Aucun mois précédent trouvé')

      const { data: prevBudgets } = await supabase
        .from('budgets').select('categorie_id, prevu').eq('mois_id', prevMoisRec.id)
      if (!prevBudgets || prevBudgets.length === 0) throw new Error('Aucun budget le mois précédent')

      // Ne pas écraser les budgets déjà définis ce mois
      const { data: existingBudgets } = await supabase
        .from('budgets').select('categorie_id').eq('mois_id', moisId!)
      const existingCatIds = new Set((existingBudgets || []).map((b: any) => b.categorie_id))
      const toInsert = prevBudgets.filter(b => !existingCatIds.has(b.categorie_id))

      if (toInsert.length > 0) {
        const { error } = await supabase.from('budgets').insert(
          toInsert.map(b => ({ mois_id: moisId!, categorie_id: b.categorie_id, prevu: b.prevu }))
        )
        if (error) throw error
      }
      return toInsert.length
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, upsert, copyFromPrevious }
}