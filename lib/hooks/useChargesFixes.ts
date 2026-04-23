'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ChargeFixe } from '@/lib/types';

export function useChargesFixes(moisId: string | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = ['charges_fixes', moisId];

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charges_fixes')
        .select('*')
        .eq('mois_id', moisId!)
        .order('ordre');
      if (error) throw error;
      return data as ChargeFixe[];
    },
  });

  const create = useMutation({
    mutationFn: async (charge: Omit<ChargeFixe, 'id'>) => {
      const { data, error } = await supabase
        .from('charges_fixes')
        .insert(charge)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const togglePayee = useMutation({
    mutationFn: async ({ id, payee }: { id: string; payee: boolean }) => {
      const { error } = await supabase
        .from('charges_fixes')
        .update({ payee })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ChargeFixe> & { id: string }) => {
      const { error } = await supabase
        .from('charges_fixes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charges_fixes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, create, togglePayee, update, remove };
}
