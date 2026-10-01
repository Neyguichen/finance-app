'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type NotificationItem = {
  id: string
  espace_id: string
  family: 'finances' | 'actions' | 'neyguichen'
  title: string
  message: string | null
  action_label: string | null
  action_href: string | null
  dedupe_key: string | null
  read_at: string | null
  archived_at: string | null
  created_at: string
}

export function useNotifications(
  espaceId: string | undefined,
  allowedFamilies?: NotificationItem['family'][]
) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', espaceId],
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('espace_id', espaceId!)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data || []) as NotificationItem[]
    },
  })

  const filteredData = allowedFamilies
    ? (query.data || []).filter(item => allowedFamilies.includes(item.family))
    : (query.data || [])
  const unreadCount = filteredData.filter(item => !item.read_at).length

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] }),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!espaceId) return
      let request = supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('espace_id', espaceId)
        .is('archived_at', null)
        .is('read_at', null)
      if (allowedFamilies?.length) request = request.in('family', allowedFamilies)
      const { error } = await request
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] }),
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString(), read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] }),
  })

  const createNotification = useMutation({
    mutationFn: async (input: {
      family?: NotificationItem['family']
      title: string
      message?: string | null
      action_label?: string | null
      action_href?: string | null
      dedupe_key?: string | null
    }) => {
      if (!espaceId) throw new Error('Budget manquant')

      if (input.dedupe_key) {
        const { data: existing, error: existingError } = await supabase
          .from('notifications')
          .select('*')
          .eq('espace_id', espaceId)
          .eq('dedupe_key', input.dedupe_key)
          .maybeSingle()
        if (existingError) throw existingError
        if (existing) return existing as NotificationItem
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          espace_id: espaceId,
          family: input.family || 'neyguichen',
          title: input.title.trim(),
          message: input.message?.trim() || null,
          action_label: input.action_label || null,
          action_href: input.action_href || null,
          dedupe_key: input.dedupe_key || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as NotificationItem
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] }),
  })

  return {
    ...query,
    data: filteredData,
    unreadCount,
    markRead,
    markAllRead,
    archive,
    createNotification,
  }
}
