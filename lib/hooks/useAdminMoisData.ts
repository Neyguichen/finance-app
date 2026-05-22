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
    console.log('🔍 useAdminMoisData DEBUG:', {
      isAdminViewing,
      adminViewEspaceId,
      month,
    })

    if (!isAdminViewing || !adminViewEspaceId || !month) {
      console.log('⛔ Skipped — missing:', {
        isAdminViewing,
        adminViewEspaceId: !!adminViewEspaceId,
        month: !!month,
      })
      setData(null)
      return
    }

    setLoading(true)
    console.log('📡 Calling admin_get_mois with:', {
      target_espace_id: adminViewEspaceId,
      target_mois: month,
    })

    supabase.rpc('admin_get_mois', {
      target_espace_id: adminViewEspaceId,
      target_mois: month,
    })
    .then(({ data: d, error }) => {
      console.log('📦 RPC response:', { data: d, error })
      if (error) console.error('Admin RPC error:', error)
      setData(d)
    })
    .then(() => setLoading(false), () => setLoading(false))
  }, [isAdminViewing, adminViewEspaceId, month])

  return { data, loading }
}