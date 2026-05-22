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
      const { data } = await supabase
        .from('mois')
        .select('mois')
        .eq('espace_id', espaceId!)

      if (!data || data.length === 0) return []

      // Extraire les années uniques et trier décroissant
      const years = [...new Set(data.map((m: any) => m.mois.slice(0, 4)))]
        .sort((a, b) => b.localeCompare(a))

      return years
    },
  })
}