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
    queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
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

      const { error } = await supabase.from('transactions').update(clean).eq('id', id)
      if (error) throw error

      if (!current.parent_transaction_id && current.is_split && ('date' in clean || 'date_validation' in clean)) {
        const childUpdates: Record<string, string | null> = {}
        if ('date' in clean && clean.date) childUpdates.date = clean.date
        if ('date_validation' in clean) childUpdates.date_validation = clean.date_validation ?? null
        if (Object.keys(childUpdates).length) {
          const { error: childErr } = await supabase
            .from('transactions').update(childUpdates).eq('parent_transaction_id', id)
          if (childErr) throw childErr
        }
      }
    },
    onSuccess: invalidate,
  });}