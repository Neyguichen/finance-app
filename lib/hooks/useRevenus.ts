'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Revenu } from '@/lib/types';

export function useRevenus(moisId: string | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = ['revenus', moisId];

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenus')
        .select('*')
        .eq('mois_id', moisId!)
        .order('ordre');
      if (error) throw error;
      return data as Revenu[];
    },
  });

  const create = useMutation({
    mutationFn: async (revenu: Omit<Revenu, 'id'>) => {
      const { data, error } = await supabase
        .from('revenus')
        .insert(revenu)
        .select()
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
    }: Partial<Revenu> & { id: string }) => {
      const { data, error } = await supabase
        .from('revenus')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenus').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  // Toggle reçu
  const toggleRecu = useMutation({
    mutationFn: async ({ id, recu }: { id: string; recu: boolean }) => {
      const { error } = await supabase
        .from('revenus')
        .update({ recu })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, create, update, remove, toggleRecu };
}
