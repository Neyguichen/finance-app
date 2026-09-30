'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type FeedbackItem = {
  id: string
  user_id: string
  espace_id: string | null
  kind: 'bug' | 'suggestion'
  title: string
  message: string
  status: 'new' | 'reviewed' | 'closed'
  created_at: string
}

export function useFeedback(espaceId: string | undefined) {
  const supabase = createClient()

  const history = useQuery({
    queryKey: ['feedback', espaceId],
    queryFn: async () => {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (espaceId) query = query.eq('espace_id', espaceId)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as FeedbackItem[]
    },
  })

  const create = useMutation({
    mutationFn: async (input: {
      kind: FeedbackItem['kind']
      title: string
      message: string
    }) => {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          espace_id: espaceId || null,
          kind: input.kind,
          title: input.title.trim(),
          message: input.message.trim(),
        })
        .select()
        .single()
      if (error) throw error
      return data as FeedbackItem
    },
  })

  return { history, create }
}
