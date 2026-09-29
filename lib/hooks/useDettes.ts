'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Dette, RemboursementDette } from '@/lib/types'

function assertValidDebtAmount(montant: number) {
  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error('Le montant de la dette ou de la créance doit être strictement positif.')
  }
}

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

  const assertDebtAmountCoversRepayments = async (detteId: string, montant: number) => {
    const { data, error } = await supabase
      .from('remboursements_dette')
      .select('montant')
      .eq('dette_id', detteId)

    if (error) throw error

    const dejaRembourse = (data || []).reduce(
      (total, remboursement) => total + Number(remboursement.montant),
      0,
    )

    if (dejaRembourse - montant > 0.005) {
      throw new Error(
        `Le montant total ne peut pas être inférieur au montant déjà remboursé (${dejaRembourse.toFixed(2)} €).`,
      )
    }
  }

  const assertRepaymentWithinDebt = async (detteId: string, montant: number, excludeId?: string) => {
    const [detteResult, remboursementsResult] = await Promise.all([
      supabase.from('dettes').select('montant').eq('id', detteId).single(),
      supabase.from('remboursements_dette').select('id, montant').eq('dette_id', detteId),
    ])

    if (detteResult.error) throw detteResult.error
    if (remboursementsResult.error) throw remboursementsResult.error

    const dejaRembourse = (remboursementsResult.data || [])
      .filter(remboursement => remboursement.id !== excludeId)
      .reduce((total, remboursement) => total + Number(remboursement.montant), 0)
    const resteDisponible = Math.max(0, Number(detteResult.data.montant) - dejaRembourse)

    if (montant - resteDisponible > 0.005) {
      throw new Error(`Le remboursement ne peut pas dépasser le reste dû (${resteDisponible.toFixed(2)} €).`)
    }
  }

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
      assertValidDebtAmount(Number(dette.montant))
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
      if (updates.montant !== undefined) {
        const montant = Number(updates.montant)
        assertValidDebtAmount(montant)
        await assertDebtAmountCoversRepayments(id, montant)
      }

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
      await assertRepaymentWithinDebt(remb.dette_id, remb.montant)
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
      const { data: remboursement, error: remboursementError } = await supabase
        .from('remboursements_dette')
        .select('dette_id')
        .eq('id', id)
        .single()
      if (remboursementError) throw remboursementError

      await assertRepaymentWithinDebt(remboursement.dette_id, montant, id)
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
