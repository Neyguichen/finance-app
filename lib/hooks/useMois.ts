'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Mois } from '@/lib/types'

export function useMois(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['mois', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('mois', { ascending: false })
      if (error) throw error
      return data as Mois[]
    },
  })

  // Explicit creation only. This mutation deliberately creates no revenues,
  // expenses, savings movements or variable budgets.
  const createMonth = useMutation({
    mutationFn: async ({ espace_id, mois, user_id }: { espace_id: string; mois: string; user_id: string }) => {
      const { data: existing, error: lookupError } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('mois', mois)
        .maybeSingle()

      if (lookupError) throw lookupError
      if (existing) return existing as Mois

      const { data, error } = await supabase
        .from('mois')
        .insert({ espace_id, mois, user_id })
        .select()
        .single()
      if (error) throw error
      return data as Mois
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, createMonth }
}
