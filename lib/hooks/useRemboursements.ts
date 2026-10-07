'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Remboursement } from '@/lib/types'

export function useRemboursements(transactionId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['remboursements', transactionId]

  const syncSplitChildrenToNet = async (parentId: string) => {
    const { data: parent, error: parentError } = await supabase
      .from('transactions')
      .select('id, montant, is_split')
      .eq('id', parentId)
      .single()
    if (parentError) throw parentError
    if (!parent.is_split) return

    const [{ data: reimbursements, error: reimbursementsError }, { data: children, error: childrenError }] = await Promise.all([
      supabase.from('remboursements').select('montant').eq('transaction_id', parentId),
      supabase.from('transactions').select('id, montant').eq('parent_transaction_id', parentId),
    ])
    if (reimbursementsError) throw reimbursementsError
    if (childrenError) throw childrenError
    if (!children || children.length === 0) return

    const reimbursementTotal = (reimbursements || []).reduce((sum, item) => sum + Number(item.montant), 0)
    const targetNet = Math.max(0, Number(parent.montant) - reimbursementTotal)
    const currentChildrenTotal = children.reduce((sum, item) => sum + Number(item.montant), 0)
    if (Math.abs(currentChildrenTotal - targetNet) < 0.01) return

    const ratio = currentChildrenTotal > 0 ? targetNet / currentChildrenTotal : 0
    let allocated = 0
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const nextAmount = i === children.length - 1
        ? Math.round((targetNet - allocated) * 100) / 100
        : Math.round(Number(child.montant) * ratio * 100) / 100
      allocated += nextAmount
      const { error } = await supabase
        .from('transactions')
        .update({ montant: nextAmount })
        .eq('id', child.id)
      if (error) throw error
    }
  }

  const query = useQuery({
    queryKey: key,
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remboursements')
        .select('*')
        .eq('transaction_id', transactionId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Remboursement[]
    },
  })

  const create = useMutation({
    mutationFn: async (r: Omit<Remboursement, 'id' | 'created_at'>) => {
      const [transactionResult, existingResult] = await Promise.all([
        supabase.from('transactions').select('montant').eq('id', r.transaction_id).single(),
        supabase.from('remboursements').select('montant').eq('transaction_id', r.transaction_id),
      ])
      if (transactionResult.error) throw transactionResult.error
      if (existingResult.error) throw existingResult.error

      const gross = Number(transactionResult.data.montant)
      const alreadyReimbursed = (existingResult.data || []).reduce((sum, item) => sum + Number(item.montant), 0)
      const nextTotal = alreadyReimbursed + Number(r.montant)
      if (!Number.isFinite(Number(r.montant)) || Number(r.montant) <= 0) {
        throw new Error('Le remboursement doit être strictement positif.')
      }
      if (nextTotal - gross > 0.005) {
        throw new Error(`Le total des remboursements ne peut pas dépasser la dépense initiale (${gross.toFixed(2)} €).`)
      }

      const { data, error } = await supabase
        .from('remboursements')
        .insert(r)
        .select()
        .single()
      if (error) throw error
      await syncSplitChildrenToNet(r.transaction_id)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })
  
  const update = useMutation({
    mutationFn: async ({ id, transaction_id, montant, note, date }: { id: string; transaction_id: string; montant: number; note: string | null; date: string }) => {
      if (!Number.isFinite(Number(montant)) || Number(montant) <= 0) {
        throw new Error('Le remboursement doit être strictement positif.')
      }

      const [transactionResult, existingResult] = await Promise.all([
        supabase.from('transactions').select('montant').eq('id', transaction_id).single(),
        supabase.from('remboursements').select('id, montant').eq('transaction_id', transaction_id),
      ])
      if (transactionResult.error) throw transactionResult.error
      if (existingResult.error) throw existingResult.error

      const gross = Number(transactionResult.data.montant)
      const otherTotal = (existingResult.data || [])
        .filter(item => item.id !== id)
        .reduce((sum, item) => sum + Number(item.montant), 0)
      if (otherTotal + Number(montant) - gross > 0.005) {
        throw new Error(`Le total des remboursements ne peut pas dépasser la dépense initiale (${gross.toFixed(2)} €).`)
      }

      const { data, error } = await supabase
        .from('remboursements')
        .update({ montant: Number(montant), note, date })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await syncSplitChildrenToNet(transaction_id)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: reimbursement, error: lookupError } = await supabase
        .from('remboursements')
        .select('transaction_id')
        .eq('id', id)
        .single()
      if (lookupError) throw lookupError
      const { error } = await supabase.from('remboursements').delete().eq('id', id)
      if (error) throw error
      await syncSplitChildrenToNet(reimbursement.transaction_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  return { ...query, create, update, remove }
}