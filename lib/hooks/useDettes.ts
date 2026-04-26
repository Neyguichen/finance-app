'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Dette, RemboursementDette } from '@/lib/types'

export function useDettes(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['dettes', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dettes')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Dette[]
    },
  })

  const create = useMutation({
    mutationFn: async (dette: Omit<Dette, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('dettes')
        .insert(dette)
        .select()
        .single()
      if (error) throw error
      return data as Dette
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dette> & { id: string }) => {
      const { error } = await supabase
        .from('dettes')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dettes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create, update, remove }
}

export function useRemboursementsDette(detteId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['remboursements_dette', detteId]

  const query = useQuery({
    queryKey: key,
    enabled: !!detteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remboursements_dette')
        .select('*')
        .eq('dette_id', detteId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as RemboursementDette[]
    },
  })

  const create = useMutation({
    mutationFn: async (r: Omit<RemboursementDette, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('remboursements_dette')
        .insert(r)
        .select()
        .single()
      if (error) throw error
      return data as RemboursementDette
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['dettes'] })
    },
  })

    // Archiver une dette (au lieu de supprimer)
  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dettes')
        .update({ archived: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Désarchiver une dette
  const unarchive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dettes')
        .update({ archived: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Modifier une dette
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dette> & { id: string }) => {
      const { error } = await supabase
        .from('dettes')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Modifier un remboursement
  const updateRemboursement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RemboursementDette> & { id: string }) => {
      const { error } = await supabase
        .from('remboursements_dette')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rembKey }),
  })

  return { ...query, create, archive, unarchive, update, remboursements, addRemboursement, removeRemboursement, updateRemboursement, }
}