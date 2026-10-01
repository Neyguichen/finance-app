'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type IncomeHistoryOccurrence = {
  id: string
  monthId: string
  month: string
  recurrentId: string | null
  nom: string
  montant: number
  type: 'actif' | 'passif'
  recu: boolean
  datePrevue: string | null
  dateReelle: string | null
}

export type IncomeHistoryMonth = {
  month: string
  planned: number
  received: number
}

export type IncomeRecurrenceRow = {
  key: string
  recurrentId: string
  nom: string
  type: 'actif' | 'passif'
  frequency: number
  occurrences: Record<string, IncomeHistoryOccurrence>
}

export function useIncomeHistory(espaceId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['income_history', espaceId],
    enabled: !!espaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: months, error: monthError }, { data: recurrents, error: recurrentError }] = await Promise.all([
        supabase.from('mois').select('id, mois').eq('espace_id', espaceId!).order('mois'),
        supabase.from('revenus_recurrents').select('id, nom, type, frequence_mois, ordre').eq('espace_id', espaceId!).order('ordre'),
      ])
      if (monthError) throw monthError
      if (recurrentError) throw recurrentError
      if (!months?.length) return { monthly: [] as IncomeHistoryMonth[], rows: [] as IncomeRecurrenceRow[] }

      const monthIds = months.map(month => month.id)
      const monthById = new Map(months.map(month => [month.id, String(month.mois).slice(0, 10)]))
      const { data: incomes, error: incomeError } = await supabase
        .from('revenus')
        .select('id, mois_id, recurrent_id, nom, montant, type, recu, date_prevue, date_reelle')
        .in('mois_id', monthIds)

      if (incomeError) throw incomeError

      const monthlyMap = new Map<string, IncomeHistoryMonth>()
      for (const month of months) {
        const key = String(month.mois).slice(0, 7)
        monthlyMap.set(key, { month: key, planned: 0, received: 0 })
      }

      const occurrencesByRecurrent = new Map<string, Record<string, IncomeHistoryOccurrence>>()
      for (const income of incomes || []) {
        const fullMonth = monthById.get(income.mois_id)
        if (!fullMonth) continue
        const monthKey = fullMonth.slice(0, 7)
        const monthRow = monthlyMap.get(monthKey)
        if (monthRow) {
          monthRow.planned += Number(income.montant)
          if (income.recu) monthRow.received += Number(income.montant)
        }

        if (income.recurrent_id) {
          const current = occurrencesByRecurrent.get(income.recurrent_id) || {}
          current[monthKey] = {
            id: income.id,
            monthId: income.mois_id,
            month: fullMonth,
            recurrentId: income.recurrent_id,
            nom: income.nom,
            montant: Number(income.montant),
            type: income.type as 'actif' | 'passif',
            recu: !!income.recu,
            datePrevue: income.date_prevue || null,
            dateReelle: income.date_reelle || null,
          }
          occurrencesByRecurrent.set(income.recurrent_id, current)
        }
      }

      const rows: IncomeRecurrenceRow[] = (recurrents || []).map(recurrent => ({
        key: recurrent.id,
        recurrentId: recurrent.id,
        nom: recurrent.nom,
        type: recurrent.type as 'actif' | 'passif',
        frequency: Number(recurrent.frequence_mois || 1),
        occurrences: occurrencesByRecurrent.get(recurrent.id) || {},
      })).filter(row => Object.keys(row.occurrences).length > 0)

      return {
        monthly: Array.from(monthlyMap.values()).sort((a,b) => a.month.localeCompare(b.month)),
        rows,
      }
    },
  })
}
