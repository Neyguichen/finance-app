'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type TodoItem = {
  id: string
  espace_id: string
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

export function useTodos(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['todos', espaceId],
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('espace_id', espaceId!)
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
    }) => {
      if (!espaceId) throw new Error('Budget manquant')
      const { data, error } = await supabase
        .from('todos')
        .insert({
          espace_id: espaceId,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', espaceId] }),
  })

  const updateTodo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TodoItem> & { id: string }) => {
      const payload: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }
      delete payload.espace_id
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', espaceId] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', espaceId] }),
  })

  const deleteTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', espaceId] }),
  })

  return { ...query, createTodo, updateTodo, toggleTodo, deleteTodo }
}
