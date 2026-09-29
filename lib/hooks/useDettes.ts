'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Dette, RemboursementDette } from '@/lib/types'

function assertValidRepayment(montant: number, date: string) {
  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error('Le montant du remboursement doit être strictement positif.')
  }
  if (!date) {
    throw new Error('La date du remboursement est obligatoire.')
  }
}

export function useDettes(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['dettes', espaceId]
  const rembKey = ['remboursements_dette', espaceId]

  // --- Dettes ---
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
    mutationFn: async (dette: Omit<Dette, 'id' | 'created_at' | 'archived'>) => {
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

  // --- Remboursements ---
  const remboursements = useQuery({
    queryKey: rembKey,
    enabled: !!espaceId,
    queryFn: async () => {
      // On récupère tous les remboursements des dettes de cet espace
      const { data: dettes } = await supabase
        .from('dettes')
        .select('id')
        .eq('espace_id', espaceId!)
      if (!dettes || dettes.length === 0) return []
      const detteIds = dettes.map(d => d.id)
      const { data, error } = await supabase
        .from('remboursements_dette')
        .select('*')
        .in('dette_id', detteIds)
        .order('date', { ascending: false })
      if (error) throw error
      return data as RemboursementDette[]
    },
  })

  const addRemboursement = useMutation({
    mutationFn: async (remb: { dette_id: string; montant: number; date: string; impacte_budget?: boolean }) => {
      assertValidRepayment(remb.montant, remb.date)
      const { data, error } = await supabase
        .from('remboursements_dette')
        .insert(remb)
        .select()
        .single()
      if (error) throw error
      return data as RemboursementDette
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rembKey })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const removeRemboursement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('remboursements_dette')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rembKey })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const updateRemboursement = useMutation({
    mutationFn: async ({ id, montant, date, impacte_budget }: { id: string; montant: number; date: string; impacte_budget?: boolean }) => {
      assertValidRepayment(montant, date)
      const { error } = await supabase
        .from('remboursements_dette')
        .update({ montant, date, ...(impacte_budget !== undefined ? { impacte_budget } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rembKey })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  return {
    ...query,
    create,
    update,
    remove,
    archive,
    unarchive,
    remboursements,
    addRemboursement,
    removeRemboursement,
    updateRemboursement,
  }
}
