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

  return { ...query, upsert }
}