'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, Remboursement } from '@/lib/types';

export function useTransactions(moisId: string | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = ['transactions', moisId];

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categorie:categories!categorie_id(*), sous_categorie:categories!sous_categorie_id(*), remboursements(*), date_validation')
        .eq('mois_id', moisId!)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error

      const all = data as (Transaction & { remboursements?: Remboursement[] })[]

      // Regrouper : attacher les enfants aux parents
      const childrenMap = new Map<string, typeof all>()
      const topLevel: typeof all = []

      for (const tx of all) {
        if (tx.parent_transaction_id) {
          const arr = childrenMap.get(tx.parent_transaction_id) || []
          arr.push(tx)
          childrenMap.set(tx.parent_transaction_id, arr)
        } else {
          topLevel.push(tx)
        }
      }

      // Attacher les enfants à chaque parent splitté
      for (const tx of topLevel) {
        if (tx.is_split) {
          tx.children = childrenMap.get(tx.id) || []
        }
      }

      return topLevel
    },
  });

  // Toutes les transactions à plat (pour stats) : enfants + non-splittés
  const allFlat = useQuery({
    queryKey: ['transactions-flat', moisId],
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categorie:categories!categorie_id(*), sous_categorie:categories!sous_categorie_id(*), remboursements(*), date_validation')
        .eq('mois_id', moisId!)
        .or('is_split.is.null,is_split.eq.false')
        .order('date', { ascending: false })
      if (error) throw error
      return data as (Transaction & { remboursements?: Remboursement[] })[]
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key })
    queryClient.invalidateQueries({ queryKey: ['transactions-flat', moisId] })
    queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
  }

  const create = useMutation({
    mutationFn: async (tx: Omit<Transaction, 'id' | 'categorie' | 'sous_categorie' | 'children'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(tx)
        .select('*, categorie:categories!categorie_id(*), sous_categorie:categories!sous_categorie_id(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const clean = { ...updates }
      delete clean.categorie
      delete clean.sous_categorie
      delete clean.children

      const { data: current, error: currentErr } = await supabase
        .from('transactions')
        .select('id, parent_transaction_id, is_split')
        .eq('id', id)
        .single()
      if (currentErr) throw currentErr

      // Split children are analytical allocations only. Their cash dates are owned
      // by the top-level transaction and must not diverge from the parent.
      if (current.parent_transaction_id) {
        delete clean.date
        delete clean.date_validation
      }

      const { error } = await supabase.from('transactions').update(clean).eq('id', id)
      if (error) throw error

      if (!current.parent_transaction_id && current.is_split && ('date' in clean || 'date_validation' in clean)) {
        const childUpdates: Record<string, string | null> = {}
        if ('date' in clean && clean.date) childUpdates.date = clean.date
        if ('date_validation' in clean) childUpdates.date_validation = clean.date_validation ?? null
        if (Object.keys(childUpdates).length > 0) {
          const { error: childErr } = await supabase
            .from('transactions')
            .update(childUpdates)
            .eq('parent_transaction_id', id)
          if (childErr) throw childErr
        }
      }
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const split = useMutation({
    mutationFn: async ({ parentId, lines }: {
      parentId: string
      lines: Array<{ categorie_id: string; sous_categorie_id?: string | null; montant: number; infos?: string | null }>
    }) => {
      const { data: parent, error: parentErr } = await supabase.from('transactions').select('*').eq('id', parentId).single()
      if (parentErr) throw parentErr

      const { data: reimbursements, error: reimbursementsErr } = await supabase
        .from('remboursements')
        .select('montant')
        .eq('transaction_id', parentId)
      if (reimbursementsErr) throw reimbursementsErr

      const reimbursementTotal = (reimbursements || []).reduce((sum, item) => sum + Number(item.montant), 0)
      const netAmount = Math.max(0, Number(parent.montant) - reimbursementTotal)
      const linesTotal = lines.reduce((sum, line) => sum + Number(line.montant), 0)
      if (Math.abs(linesTotal - netAmount) >= 0.01) {
        throw new Error(`Le split doit répartir le coût net de ${netAmount.toFixed(2)} €`)
      }

      const { error: deleteErr } = await supabase.from('transactions').delete().eq('parent_transaction_id', parentId)
      if (deleteErr) throw deleteErr

      const { error: updateErr } = await supabase.from('transactions').update({ is_split: true }).eq('id', parentId)
      if (updateErr) throw updateErr

      const children = lines.map(line => ({
        mois_id: parent.mois_id,
        date: parent.date,
        date_validation: parent.date_validation || null,
        parent_transaction_id: parentId,
        categorie_id: line.categorie_id,
        sous_categorie_id: line.sous_categorie_id || null,
        montant: line.montant,
        infos: line.infos || null,
      }))
      const { error: insertErr } = await supabase.from('transactions').insert(children)
      if (insertErr) throw insertErr
    },
    onSuccess: invalidate,
  })

  const unsplit = useMutation({
    mutationFn: async (parentId: string) => {
      const { error: deleteErr } = await supabase.from('transactions').delete().eq('parent_transaction_id', parentId)
      if (deleteErr) throw deleteErr
      const { error } = await supabase.from('transactions').update({ is_split: false }).eq('id', parentId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    ...query,
    allFlat: allFlat.data ?? [],
    create,
    update,
    remove,
    split,
    unsplit,
  }
}
