'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Mois } from '@/lib/types'

type BudgetCopyRow = {
  categorie_id: string
  prevu: number | string | null
}

type RecurrenceRule = {
  created_at: string
  frequence_mois: number
}

const hasBudgetAmount = (budget: BudgetCopyRow) => Number(budget.prevu || 0) > 0

async function copyMissingBudgetsFromPreviousMonth(
  supabase: any,
  espaceId: string,
  currentMonth: string,
  currentMoisId: string
) {
  const { data: prevMoisRec } = await supabase
    .from('mois')
    .select('id')
    .eq('espace_id', espaceId)
    .lt('mois', currentMonth)
    .order('mois', { ascending: false })
    .limit(1)
    .single()

  if (!prevMoisRec) return 0

  const { data: prevBudgets } = await supabase
    .from('budgets')
    .select('categorie_id, prevu')
    .eq('mois_id', prevMoisRec.id)
  const prevBudgetsWithAmount = ((prevBudgets || []) as BudgetCopyRow[]).filter(hasBudgetAmount)

  if (prevBudgetsWithAmount.length === 0) return 0

  const { data: existingBudgets } = await supabase
    .from('budgets')
    .select('categorie_id, prevu')
    .eq('mois_id', currentMoisId)
  const existingCatIdsWithAmount = new Set(
    ((existingBudgets || []) as BudgetCopyRow[])
      .filter(hasBudgetAmount)
      .map(budget => budget.categorie_id)
  )
  const toCopy = prevBudgetsWithAmount.filter(
    budget => !existingCatIdsWithAmount.has(budget.categorie_id)
  )

  if (toCopy.length === 0) return 0

  const { error } = await supabase.from('budgets').upsert(
    toCopy.map(budget => ({
      mois_id: currentMoisId,
      categorie_id: budget.categorie_id,
      prevu: Number(budget.prevu),
    })),
    { onConflict: 'mois_id,categorie_id' }
  )

  if (error) throw error

  return toCopy.length
}

export function useMois(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['mois', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('mois', { ascending: false })
      if (error) throw error
      return data as Mois[]
    },
  })

  const getOrCreate = useMutation({
    mutationFn: async ({ espace_id, mois, user_id }: { espace_id: string; mois: string; user_id: string }) => {
      const { data: existing } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('mois', mois)
        .single()

      if (existing) {
        const theMois = existing as Mois

        const [{ count: revCount }, { count: cfCount }, { count: epCount }] = await Promise.all([
          supabase
            .from('revenus')
            .select('recurrent_id', { count: 'exact', head: true })
            .eq('mois_id', theMois.id)
            .not('recurrent_id', 'is', null),
          supabase
            .from('charges_fixes')
            .select('recurrent_id', { count: 'exact', head: true })
            .eq('mois_id', theMois.id)
            .not('recurrent_id', 'is', null),
          supabase
            .from('mouvements_epargne')
            .select('recurrent_id', { count: 'exact', head: true })
            .eq('mois_id', theMois.id)
            .not('recurrent_id', 'is', null),
        ])

        if ((revCount ?? 0) > 0 || (cfCount ?? 0) > 0 || (epCount ?? 0) > 0) {
          await copyMissingBudgetsFromPreviousMonth(supabase, espace_id, mois, theMois.id)
          return theMois
        }

        const moisDate = new Date(mois)
        const shouldCopy = (rec: RecurrenceRule) => {
          const created = new Date(rec.created_at)
          const diff =
            (moisDate.getFullYear() - created.getFullYear()) * 12 +
            (moisDate.getMonth() - created.getMonth())
          return diff >= 0 && diff % rec.frequence_mois === 0
        }

        const [{ data: revRec }, { data: cfRec }, { data: epRec }] = await Promise.all([
          supabase.from('revenus_recurrents').select('*').eq('espace_id', espace_id).eq('actif', true),
          supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
          supabase.from('epargne_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
        ])

        if (revRec && revRec.length > 0) {
          const rows = revRec.filter(shouldCopy).map((rec: any, i: number) => ({
            mois_id: theMois.id, recurrent_id: rec.id, type: rec.type,
            nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
          }))
          if (rows.length > 0) await supabase.from('revenus').insert(rows)
        }

        if (cfRec && cfRec.length > 0) {
          const rows = cfRec.filter(shouldCopy).map((rec: any, i: number) => ({
            mois_id: theMois.id, recurrent_id: rec.id,
            nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
          }))
          if (rows.length > 0) await supabase.from('charges_fixes').insert(rows)
        }

        if (epRec && epRec.length > 0) {
          const rows = epRec.filter(shouldCopy).map((rec: any) => ({
            mois_id: theMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
            enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
            type: 'epargne' as const, date: mois, note: rec.note,
          }))
          if (rows.length > 0) await supabase.from('mouvements_epargne').insert(rows)
        }

        await copyMissingBudgetsFromPreviousMonth(supabase, espace_id, mois, theMois.id)
        return theMois
      }

      const { data, error } = await supabase
        .from('mois')
        .insert({ espace_id, mois, user_id })
        .select()
        .single()
      if (error) throw error
      const newMois = data as Mois

      const moisDate = new Date(mois)
      const shouldCopy = (rec: RecurrenceRule) => {
        const created = new Date(rec.created_at)
        const diff =
          (moisDate.getFullYear() - created.getFullYear()) * 12 +
          (moisDate.getMonth() - created.getMonth())
        return diff >= 0 && diff % rec.frequence_mois === 0
      }

      const [{ data: revRec }, { data: cfRec }, { data: epRec }] = await Promise.all([
        supabase.from('revenus_recurrents').select('*').eq('espace_id', espace_id).eq('actif', true),
        supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
        supabase.from('epargne_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
      ])

      if (revRec && revRec.length > 0) {
        const rows = revRec.filter(shouldCopy).map((rec: any, i: number) => ({
          mois_id: newMois.id, recurrent_id: rec.id, type: rec.type,
          nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
        }))
        if (rows.length > 0) await supabase.from('revenus').insert(rows)
      }

      if (cfRec && cfRec.length > 0) {
        const rows = cfRec.filter(shouldCopy).map((rec: any, i: number) => ({
          mois_id: newMois.id, recurrent_id: rec.id,
          nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
        }))
        if (rows.length > 0) await supabase.from('charges_fixes').insert(rows)
      }

      if (epRec && epRec.length > 0) {
        const rows = epRec.filter(shouldCopy).map((rec: any) => ({
          mois_id: newMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
          enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
          type: 'epargne' as const, date: mois, note: rec.note,
        }))
        if (rows.length > 0) await supabase.from('mouvements_epargne').insert(rows)
      }

      await copyMissingBudgetsFromPreviousMonth(supabase, espace_id, mois, newMois.id)
      return newMois
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  return { ...query, getOrCreate }
}
