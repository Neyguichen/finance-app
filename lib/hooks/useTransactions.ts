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
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Transaction> & { id: string }) => {
      const clean = { ...updates }
      delete clean.categorie
      delete clean.sous_categorie
      delete clean.children
      const { error } = await supabase
        .from('transactions')
        .update(clean)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // --- SPLIT ---
  const split = useMutation({
    mutationFn: async ({ parentId, lines }: {
      parentId: string
      lines: Array<{
        categorie_id: string
        sous_categorie_id?: string | null
        montant: number
        infos?: string | null
      }>
    }) => {
      // 1. Récupérer le parent pour copier date, mois_id, date_validation
      const { data: parent, error: parentErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', parentId)
        .single()
      if (parentErr) throw parentErr

      // 2. Supprimer les anciens enfants s'il y en a (re-split)
      await supabase
        .from('transactions')
        .delete()
        .eq('parent_transaction_id', parentId)

      // 3. Marquer le parent comme splitté
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({ is_split: true })
        .eq('id', parentId)
      if (updateErr) throw updateErr

      // 4. Créer les enfants
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

      const { error: insertErr } = await supabase
        .from('transactions')
        .insert(children)
      if (insertErr) throw insertErr
    },
    onSuccess: invalidate,
  })

  // --- UNSPLIT ---
  const unsplit = useMutation({
    mutationFn: async (parentId: string) => {
      // 1. Supprimer les enfants
      await supabase
        .from('transactions')
        .delete()
        .eq('parent_transaction_id', parentId)

      // 2. Remettre le parent en mode normal
      const { error } = await supabase
        .from('transactions')
        .update({ is_split: false })
        .eq('id', parentId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    ...query,
    allFlat: allFlat.data ?? [],
    create, update, remove,
    split, unsplit,
  };
}