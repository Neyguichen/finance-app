'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  monthStartFromDate,
  normalizeImportLabel,
  type CsvMapping,
  type ImportNature,
  type MappedImportRow,
} from '@/lib/import-csv'

export type ImportFormat = {
  id: string
  espace_id: string
  name: string
  delimiter: string
  mapping: CsvMapping
  created_at: string
  updated_at: string
}

export type ImportBatch = {
  id: string
  espace_id: string
  format_id: string | null
  file_name: string | null
  status: 'imported' | 'cancelled'
  row_count: number
  created_count: number
  matched_count: number
  ignored_count: number
  error_count: number
  created_at: string
  cancelled_at: string | null
}

export type ImportMatch = {
  kind: 'duplicate_income' | 'duplicate_expense' | 'duplicate_fixed' | 'fixed_candidate'
  targetId: string
  label: string
  detail: string
  beforeState?: Record<string, any>
}

export type ImportPreviewRow = MappedImportRow & {
  status: 'new' | 'duplicate' | 'fixed_candidate'
  match: ImportMatch | null
}

const cents = (value: number) => Math.round(Number(value) * 100) / 100

function labelLooksSame(a: string, b: string) {
  const left = normalizeImportLabel(a)
  const right = normalizeImportLabel(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

export function useCsvImport(espaceId: string | undefined, userId: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const formats = useQuery({
    queryKey: ['import_formats', espaceId],
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_formats')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data || []) as ImportFormat[]
    },
  })

  const history = useQuery({
    queryKey: ['import_batches', espaceId],
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data || []) as ImportBatch[]
    },
  })

  const saveFormat = useMutation({
    mutationFn: async ({ name, delimiter, mapping }: { name: string; delimiter: string; mapping: CsvMapping }) => {
      if (!espaceId) throw new Error('Budget manquant')
      const { data, error } = await supabase
        .from('import_formats')
        .upsert(
          {
            espace_id: espaceId,
            name: name.trim(),
            delimiter,
            mapping,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'espace_id,name' }
        )
        .select()
        .single()
      if (error) throw error
      return data as ImportFormat
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['import_formats', espaceId] }),
  })

  const analyze = useMutation({
    mutationFn: async (rows: MappedImportRow[]) => {
      if (!espaceId) throw new Error('Budget manquant')
      if (rows.length === 0) return [] as ImportPreviewRow[]

      const monthStarts = [...new Set(rows.map(row => monthStartFromDate(row.date)))]
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId)
        .in('mois', monthStarts)
      if (monthsError) throw monthsError

      const monthIds = (months || []).map(month => month.id)
      const [incomeResult, fixedResult, transactionResult] = monthIds.length > 0
        ? await Promise.all([
            supabase.from('revenus').select('id, mois_id, nom, montant, recu, date_reelle').in('mois_id', monthIds),
            supabase.from('charges_fixes').select('id, mois_id, nom, montant, montant_reel, payee, date_prevue, date_reelle').in('mois_id', monthIds),
            supabase.from('transactions').select('id, mois_id, montant, date, date_validation, infos, parent_transaction_id').in('mois_id', monthIds).is('parent_transaction_id', null),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ]

      if (incomeResult.error) throw incomeResult.error
      if (fixedResult.error) throw fixedResult.error
      if (transactionResult.error) throw transactionResult.error

      const monthById = new Map((months || []).map(month => [month.id, String(month.mois).slice(0, 10)]))

      return rows.map<ImportPreviewRow>(row => {
        if (row.nature === 'ignore' || row.nature === 'savings_internal') {
          return { ...row, status: 'new', match: null }
        }

        const monthStart = monthStartFromDate(row.date)
        const amount = Math.abs(cents(row.amount))

        if (row.nature === 'income') {
          const duplicate = (incomeResult.data || []).find((income: any) =>
            monthById.get(income.mois_id) === monthStart &&
            income.recu &&
            cents(income.montant) === amount &&
            income.date_reelle === row.date &&
            labelLooksSame(income.nom || '', row.label)
          )
          if (duplicate) {
            return {
              ...row,
              status: 'duplicate',
              match: {
                kind: 'duplicate_income',
                targetId: duplicate.id,
                label: duplicate.nom,
                detail: 'Revenu déjà reçu avec même date, montant et libellé proche.',
              },
            }
          }
          return { ...row, status: 'new', match: null }
        }

        const duplicateTransaction = (transactionResult.data || []).find((transaction: any) =>
          monthById.get(transaction.mois_id) === monthStart &&
          cents(transaction.montant) === amount &&
          (transaction.date === row.date || transaction.date_validation === row.date) &&
          labelLooksSame(transaction.infos || '', row.label)
        )
        if (duplicateTransaction) {
          return {
            ...row,
            status: 'duplicate',
            match: {
              kind: 'duplicate_expense',
              targetId: duplicateTransaction.id,
              label: duplicateTransaction.infos || 'Dépense existante',
              detail: 'Dépense déjà présente avec même date, montant et libellé proche.',
            },
          }
        }

        const paidFixed = (fixedResult.data || []).find((fixed: any) =>
          monthById.get(fixed.mois_id) === monthStart &&
          fixed.payee &&
          cents(fixed.montant_reel ?? fixed.montant) === amount &&
          fixed.date_reelle === row.date &&
          labelLooksSame(fixed.nom || '', row.label)
        )
        if (paidFixed) {
          return {
            ...row,
            status: 'duplicate',
            match: {
              kind: 'duplicate_fixed',
              targetId: paidFixed.id,
              label: paidFixed.nom,
              detail: 'Charge fixe déjà payée avec même date, montant et libellé proche.',
            },
          }
        }

        const fixedCandidate = (fixedResult.data || []).find((fixed: any) =>
          monthById.get(fixed.mois_id) === monthStart &&
          !fixed.payee &&
          cents(fixed.montant) === amount &&
          labelLooksSame(fixed.nom || '', row.label)
        )
        if (fixedCandidate) {
          return {
            ...row,
            status: 'fixed_candidate',
            match: {
              kind: 'fixed_candidate',
              targetId: fixedCandidate.id,
              label: fixedCandidate.nom,
              detail: 'Cette ligne peut rapprocher une charge fixe prévue au lieu de créer une nouvelle dépense.',
              beforeState: {
                payee: fixedCandidate.payee,
                montant_reel: fixedCandidate.montant_reel,
                date_reelle: fixedCandidate.date_reelle,
              },
            },
          }
        }

        return { ...row, status: 'new', match: null }
      })
    },
  })

  async function getOrCreateMonth(date: string) {
    if (!espaceId || !userId) throw new Error('Budget ou utilisateur manquant')
    const monthStart = monthStartFromDate(date)

    const { data: existing, error: lookupError } = await supabase
      .from('mois')
      .select('id, mois')
      .eq('espace_id', espaceId)
      .eq('mois', monthStart)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existing) return existing

    const { data, error } = await supabase
      .from('mois')
      .insert({ espace_id: espaceId, user_id: userId, mois: monthStart })
      .select('id, mois')
      .single()
    if (error) throw error
    return data
  }

  const importRows = useMutation({
    mutationFn: async ({
      rows,
      fileName,
      formatId,
    }: {
      rows: ImportPreviewRow[]
      fileName: string
      formatId?: string | null
    }) => {
      if (!espaceId || !userId) throw new Error('Budget ou utilisateur manquant')

      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          espace_id: espaceId,
          format_id: formatId || null,
          file_name: fileName,
          row_count: rows.length,
        })
        .select()
        .single()
      if (batchError) throw batchError

      let createdCount = 0
      let matchedCount = 0
      let ignoredCount = 0
      let errorCount = 0

      for (const row of rows) {
        try {
          if (row.nature === 'ignore' || row.nature === 'savings_internal') {
            ignoredCount += 1
            const { error } = await supabase.from('import_batch_items').insert({
              batch_id: batch.id,
              row_index: row.rowIndex,
              nature: row.nature,
              action: 'ignored',
              raw: row,
            })
            if (error) throw error
            continue
          }

          if (row.status === 'duplicate' && row.match) {
            matchedCount += 1
            const { error } = await supabase.from('import_batch_items').insert({
              batch_id: batch.id,
              row_index: row.rowIndex,
              nature: row.nature,
              action: 'matched',
              target_table: row.match.kind === 'duplicate_income'
                ? 'revenus'
                : row.match.kind === 'duplicate_fixed'
                  ? 'charges_fixes'
                  : 'transactions',
              target_id: row.match.targetId,
              raw: row,
            })
            if (error) throw error
            continue
          }

          if (row.status === 'fixed_candidate' && row.match?.kind === 'fixed_candidate') {
            const { error: fixedError } = await supabase
              .from('charges_fixes')
              .update({
                payee: true,
                montant_reel: Math.abs(row.amount),
                date_reelle: row.date,
              })
              .eq('id', row.match.targetId)
            if (fixedError) throw fixedError

            const { error: itemError } = await supabase.from('import_batch_items').insert({
              batch_id: batch.id,
              row_index: row.rowIndex,
              nature: 'expense',
              action: 'matched',
              target_table: 'charges_fixes',
              target_id: row.match.targetId,
              before_state: row.match.beforeState || null,
              raw: row,
            })
            if (itemError) throw itemError
            matchedCount += 1
            continue
          }

          const month = await getOrCreateMonth(row.date)

          if (row.nature === 'income') {
            const { data: created, error } = await supabase
              .from('revenus')
              .insert({
                mois_id: month.id,
                recurrent_id: null,
                type: 'actif',
                nom: row.label,
                montant: Math.abs(row.amount),
                recu: true,
                date_prevue: row.date,
                date_reelle: row.date,
                ordre: 0,
              })
              .select('id')
              .single()
            if (error) throw error

            const { error: itemError } = await supabase.from('import_batch_items').insert({
              batch_id: batch.id,
              row_index: row.rowIndex,
              nature: 'income',
              action: 'created',
              target_table: 'revenus',
              target_id: created.id,
              raw: row,
            })
            if (itemError) throw itemError
            createdCount += 1
            continue
          }

          if (!row.categoryId) throw new Error('Catégorie requise pour créer une dépense')

          const { data: created, error } = await supabase
            .from('transactions')
            .insert({
              mois_id: month.id,
              categorie_id: row.categoryId,
              sous_categorie_id: null,
              date: row.date,
              date_validation: row.date,
              montant: Math.abs(row.amount),
              infos: row.label,
              is_split: false,
            })
            .select('id')
            .single()
          if (error) throw error

          const { error: itemError } = await supabase.from('import_batch_items').insert({
            batch_id: batch.id,
            row_index: row.rowIndex,
            nature: 'expense',
            action: 'created',
            target_table: 'transactions',
            target_id: created.id,
            raw: row,
          })
          if (itemError) throw itemError
          createdCount += 1
        } catch (error: any) {
          errorCount += 1
          await supabase.from('import_batch_items').insert({
            batch_id: batch.id,
            row_index: row.rowIndex,
            nature: row.nature as ImportNature,
            action: 'error',
            raw: { ...row, error: error?.message || 'Erreur inconnue' },
          })
        }
      }

      const { error: updateError } = await supabase
        .from('import_batches')
        .update({
          created_count: createdCount,
          matched_count: matchedCount,
          ignored_count: ignoredCount,
          error_count: errorCount,
        })
        .eq('id', batch.id)
      if (updateError) throw updateError

      return { batchId: batch.id, createdCount, matchedCount, ignoredCount, errorCount }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['mois', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const undoBatch = useMutation({
    mutationFn: async (batchId: string) => {
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .select('*')
        .eq('id', batchId)
        .single()
      if (batchError) throw batchError
      if (batch.status === 'cancelled') return

      const { data: items, error: itemsError } = await supabase
        .from('import_batch_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('row_index', { ascending: false })
      if (itemsError) throw itemsError

      for (const item of items || []) {
        if (item.action === 'created' && item.target_table && item.target_id) {
          if (item.target_table === 'revenus') {
            const { error } = await supabase.from('revenus').delete().eq('id', item.target_id)
            if (error) throw error
          } else if (item.target_table === 'transactions') {
            const { error } = await supabase.from('transactions').delete().eq('id', item.target_id)
            if (error) throw error
          }
        } else if (
          item.action === 'matched' &&
          item.target_table === 'charges_fixes' &&
          item.target_id &&
          item.before_state
        ) {
          const { error } = await supabase
            .from('charges_fixes')
            .update(item.before_state)
            .eq('id', item.target_id)
          if (error) throw error
        }
      }

      const { error: cancelError } = await supabase
        .from('import_batches')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', batchId)
      if (cancelError) throw cancelError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  return {
    formats,
    history,
    saveFormat,
    analyze,
    importRows,
    undoBatch,
  }
}
