'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type TodoItem = {
  id: string
  owner_user_id: string
  espace_id: string | null
  title: string
  status: 'todo' | 'done'
  due_date: string | null
  note: string | null
  link_label: string | null
  link_href: string | null
  object_type: string | null
  object_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export function useTodos(userId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['todos', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('status', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as TodoItem[]
    },
  })

  const createTodo = useMutation({
    mutationFn: async (input: {
      title: string
      due_date?: string | null
      note?: string | null
      link_label?: string | null
      link_href?: string | null
      object_type?: string | null
      object_id?: string | null
      espace_id?: string | null
    }) => {
      if (!userId) throw new Error('Utilisateur manquant')

      if (input.object_type && input.object_id) {
        const { data: existing, error: existingError } = await supabase
          .from('todos')
          .select('*')
          .eq('owner_user_id', userId)
          .eq('object_type', input.object_type)
          .eq('object_id', input.object_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existingError) throw existingError
        if (existing) return existing as TodoItem
      }

      const { data, error } = await supabase
        .from('todos')
        .insert({
          owner_user_id: userId,
          espace_id: input.espace_id || null,
          title: input.title.trim(),
          due_date: input.due_date || null,
          note: input.note?.trim() || null,
          link_label: input.link_label || null,
          link_href: input.link_href || null,
          object_type: input.object_type || null,
          object_id: input.object_id || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as TodoItem
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', userId] }),
  })

  const updateTodo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TodoItem> & { id: string }) => {
      const payload: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }
      delete payload.owner_user_id
      delete payload.created_at
      const { data, error } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as TodoItem
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', userId] }),
  })

  const toggleTodo = useMutation({
    mutationFn: async (todo: TodoItem) => {
      const done = todo.status !== 'done'
      const { error } = await supabase
        .from('todos')
        .update({
          status: done ? 'done' : 'todo',
          completed_at: done ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', todo.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', userId] }),
  })

  const deleteTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', userId] }),
  })

  return { ...query, createTodo, updateTodo, toggleTodo, deleteTodo }
}
