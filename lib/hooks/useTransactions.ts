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
        .select('*, categorie:categories(*), remboursements(*)')
        .eq('mois_id', moisId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as (Transaction & { remboursements?: Remboursement[] })[]
    },
  });

  const create = useMutation({
    mutationFn: async (tx: Omit<Transaction, 'id' | 'categorie'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(tx)
        .select('*, categorie:categories(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, create, update, remove };
}
