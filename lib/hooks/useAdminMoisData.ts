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
    if (!isAdminViewing || !adminViewEspaceId || !month) {
      setData(null)
      return
    }

    setLoading(true)

    supabase.rpc('admin_get_mois', {
      p_espace_id: adminViewEspaceId,
      p_mois: month,
    })
    .then(({ data: d, error }) => {
      if (error) console.error('Admin RPC error:', error)
      setData(d)
    })
    .then(() => setLoading(false), () => setLoading(false))
  }, [isAdminViewing, adminViewEspaceId, month])

  return { data, loading }
}