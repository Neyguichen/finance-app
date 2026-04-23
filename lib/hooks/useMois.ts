'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Mois } from '@/lib/types';

export function useMois(compteId: string | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = ['mois', compteId];

  const query = useQuery({
    queryKey: key,
    enabled: !!compteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mois')
        .select('*')
        .eq('compte_id', compteId!)
        .order('mois', { ascending: false });
      if (error) throw error;
      return data as Mois[];
    },
  });

  // Créer ou récupérer un mois
  const getOrCreate = useMutation({
    mutationFn: async ({
      compte_id,
      mois,
      user_id,
    }: {
      compte_id: string;
      mois: string;
      user_id: string;
    }) => {
      // Tente de récupérer
      const { data: existing } = await supabase
        .from('mois')
        .select('*')
        .eq('compte_id', compte_id)
        .eq('mois', mois)
        .single();

      if (existing) return existing as Mois;

      // Sinon crée
      const { data, error } = await supabase
        .from('mois')
        .insert({ compte_id, mois, user_id })
        .select()
        .single();
      if (error) throw error;
      return data as Mois;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, getOrCreate };
}
