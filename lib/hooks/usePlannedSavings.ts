'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function usePlannedSavings(moisId?: string) {
  const supabase=createClient()
  return useQuery({
    queryKey:['epargne_prevues',moisId],
    enabled:!!moisId,
    queryFn:async()=>{
      const {data,error}=await supabase.from('epargne_prevues').select('*').eq('mois_id',moisId!)
      if(error) throw error
      return data||[]
    }
  })
}
