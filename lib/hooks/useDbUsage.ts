'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface DbUsage {
  size_bytes: number
  size_mb: number
  limit_mb: number
  percent: number
}

export function useDbUsage() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['db_usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_db_usage')
      if (error) throw error
      return data as DbUsage
    },
    staleTime: 60_000, // rafraîchir max 1 fois par minute
  })
}