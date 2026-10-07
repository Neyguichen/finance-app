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
  montantReel: number | null
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
  baseAmount: number
  active: boolean
  startMonth: string | null
  stoppedAt: string | null
  order: number
  occurrences: Record<string, IncomeHistoryOccurrence>
}

export type IncomeHistoryData = {
  monthly: IncomeHistoryMonth[]
  rows: IncomeRecurrenceRow[]
  preparedMonths: Record<string, string>
}

function addMonthsKey(monthKey: string, amount: number) {
  const [year, month] = monthKey.slice(0, 7).split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function useIncomeHistory(espaceId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['income_history', espaceId],
    enabled: !!espaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<IncomeHistoryData> => {
      const [{ data: months, error: monthError }, { data: recurrents, error: recurrentError }] = await Promise.all([
        supabase.from('mois').select('id, mois').eq('espace_id', espaceId!).order('mois'),
        supabase.from('revenus_recurrents').select('id, nom, type, montant, actif, frequence_mois, mois_debut, ordre').eq('espace_id', espaceId!).order('ordre'),
      ])
      if (monthError) throw monthError
      if (recurrentError) throw recurrentError

      if (!months?.length) {
        return { monthly: [], rows: [], preparedMonths: {} }
      }

      const monthIds = months.map(month => month.id)
      const monthById = new Map(months.map(month => [month.id, String(month.mois).slice(0, 10)]))
      const preparedMonths: Record<string, string> = {}
      for (const month of months) preparedMonths[String(month.mois).slice(0, 7)] = month.id

      const { data: incomes, error: incomeError } = await supabase
        .from('revenus')
        .select('id, mois_id, recurrent_id, nom, montant, montant_reel, type, recu, date_prevue, date_reelle')
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
          if (income.recu) monthRow.received += Number(income.montant_reel ?? income.montant)
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
            montantReel: income.montant_reel == null ? null : Number(income.montant_reel),
            type: income.type as 'actif' | 'passif',
            recu: !!income.recu,
            datePrevue: income.date_prevue || null,
            dateReelle: income.date_reelle || null,
          }
          occurrencesByRecurrent.set(income.recurrent_id, current)
        }
      }

      const rows: IncomeRecurrenceRow[] = (recurrents || []).map(recurrent => {
        const occurrences = occurrencesByRecurrent.get(recurrent.id) || {}
        const occurrenceMonths = Object.keys(occurrences).sort()
        const frequency = Number(recurrent.frequence_mois || 1)
        const startMonth = recurrent.mois_debut ? String(recurrent.mois_debut).slice(0, 7) : (occurrenceMonths[0] || null)
        const lastOccurrence = occurrenceMonths[occurrenceMonths.length - 1] || null
        const stoppedAt = !recurrent.actif
          ? lastOccurrence
            ? addMonthsKey(lastOccurrence, frequency)
            : startMonth
          : null

        return {
          key: recurrent.id,
          recurrentId: recurrent.id,
          nom: recurrent.nom,
          type: recurrent.type as 'actif' | 'passif',
          frequency,
          baseAmount: Number(recurrent.montant || 0),
          active: !!recurrent.actif,
          startMonth,
          stoppedAt,
          order: Number(recurrent.ordre || 0),
          occurrences,
        }
      }).filter(row => row.startMonth || Object.keys(row.occurrences).length > 0)

      return {
        monthly: Array.from(monthlyMap.values()).sort((a,b) => a.month.localeCompare(b.month)),
        rows,
        preparedMonths,
      }
    },
  })
}
