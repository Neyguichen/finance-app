'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'

export function useAdminMoisData(month: string) {
  const supabase = createClient()
  const { isAdminViewing, adminViewEspaceId } = useApp()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Ce hook ne fait RIEN si on n'est PAS en mode admin
    if (!isAdminViewing || !adminViewEspaceId || !month) {
      setData(null)
      return
    }

    setLoading(true)
    supabase.rpc('admin_get_mois', {
      target_espace_id: adminViewEspaceId,
      target_mois: month  // format DATE attendu par Supabase YYYY-MM-DD
    })
    .then(({ data: d, error }) => {
      if (error) console.error('Admin RPC error:', error)
      setData(d)
    })
    .then(() => setLoading(false), () => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminViewing, adminViewEspaceId, month])

  return { data, loading }
}