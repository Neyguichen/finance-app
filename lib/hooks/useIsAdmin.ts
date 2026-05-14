'use client'

import { useApp } from '@/components/AppContext'
import { isAdmin } from '@/lib/utils'

export function useIsAdmin() {
  const { userId } = useApp()
  return isAdmin(userId)
}