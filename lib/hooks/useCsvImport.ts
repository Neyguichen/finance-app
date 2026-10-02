'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  monthStartFromDate,
  type CsvMapping,
  type ImportNature,
  type MappedImportRow,
} from '@/lib/import-csv'
import { amountDistance, cents, labelsClose, normalizeFinancialLabel, plausibleFixedMatch, sameAmount, sameDateAmountLabel } from '@/lib/reconciliation'

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
  status: 'reviewing' | 'completed' | 'cancelled'
  row_count: number
  created_count: number
  matched_count: number
  ignored_count: number
  error_count: number
  created_at: string
  cancelled_at: string | null
  file_fingerprint: string | null
}

export type ImportMatch = {
  kind:
    | 'duplicate_income'
    | 'duplicate_expense'
    | 'duplicate_fixed'
    | 'fixed_candidate'
    | 'duplicate_savings'
  targetId: string
  label: string
  detail: string
  beforeState?: Record<string, any>
}

export type ImportDecision = 'create' | 'match' | 'ignore' | 'review'

export type ImportPreviewRow = MappedImportRow & {
  status: 'new' | 'duplicate' | 'duplicate_pending' | 'duplicate_in_file' | 'fixed_candidate'
  match: ImportMatch | null
  decision: ImportDecision
  duplicateOfRowIndex?: number | null
  duplicatePendingItemId?: string | null
  duplicatePendingFileName?: string | null
}

function snapshotValue(value: any) {
  if (value == null) return null
  if (typeof value === 'number') return cents(value)
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return cents(value)
  return value
}

function snapshotMatches(current: Record<string, any>, snapshot: Record<string, any>) {
  return Object.entries(snapshot).every(([key, value]) =>
    snapshotValue(current?.[key]) === snapshotValue(value)
  )
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

  const checkFingerprint = useMutation({
    mutationFn: async (fingerprint: string) => {
      if (!espaceId || !fingerprint) return null
      const { data, error } = await supabase
        .from('import_batches')
        .select('id, file_name, created_at, status, file_fingerprint')
        .eq('espace_id', espaceId)
        .eq('file_fingerprint', fingerprint)
        .in('status', ['reviewing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as ImportBatch | null
    },
  })

  const analyze = useMutation({
    mutationFn: async (rows: MappedImportRow[]) => {
      if (!espaceId) throw new Error('Budget manquant')
      if (rows.length === 0) return [] as ImportPreviewRow[]

      const monthStarts = Array.from(new Set(rows.map(row => monthStartFromDate(row.date))))
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId)
        .in('mois', monthStarts)
      if (monthsError) throw monthsError

      const monthIds = (months || []).map(month => month.id)
      const [incomeResult, fixedResult, transactionResult, savingsResult] = monthIds.length > 0
        ? await Promise.all([
            supabase.from('revenus').select('id, mois_id, nom, montant, recu, date_reelle').in('mois_id', monthIds),
            supabase.from('charges_fixes').select('id, mois_id, nom, montant, montant_reel, payee, date_prevue, date_reelle').in('mois_id', monthIds),
            supabase.from('transactions').select('id, mois_id, montant, date, date_validation, infos, parent_transaction_id').in('mois_id', monthIds).is('parent_transaction_id', null),
            supabase.from('mouvements_epargne').select('id, mois_id, type, montant, date, note, enveloppe_source_id, enveloppe_dest_id').in('mois_id', monthIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ]

      if (incomeResult.error) throw incomeResult.error
      if (fixedResult.error) throw fixedResult.error
      if (transactionResult.error) throw transactionResult.error
      if (savingsResult.error) throw savingsResult.error

      const { data: reviewingBatches, error: reviewingError } = await supabase
        .from('import_batches')
        .select('id, file_name')
        .eq('espace_id', espaceId)
        .eq('status', 'reviewing')
      if (reviewingError) throw reviewingError

      const reviewingIds = (reviewingBatches || []).map(batch => batch.id)
      const { data: pendingItems, error: pendingError } = reviewingIds.length > 0
        ? await supabase
            .from('import_batch_items')
            .select('id, batch_id, raw')
            .in('batch_id', reviewingIds)
            .eq('action', 'pending')
        : { data: [], error: null }
      if (pendingError) throw pendingError

      const batchNameById = new Map((reviewingBatches || []).map(batch => [batch.id, batch.file_name]))

      const monthById = new Map((months || []).map(month => [month.id, String(month.mois).slice(0, 10)]))

      const analyzed = rows.map<ImportPreviewRow>(row => {
        if (row.nature === 'ignore' || row.nature === 'savings_internal') {
          return { ...row, status: 'new', match: null, decision: 'ignore' }
        }

        const monthStart = monthStartFromDate(row.date)
        const amount = Math.abs(cents(row.amount))

        const pendingDuplicate = (pendingItems || []).find((item: any) => {
          if (item.id === (row as any)._pendingItemId) return false
          const pending = item.raw || {}
          return pending.date === row.date &&
            sameAmount(pending.amount, row.amount) &&
            labelsClose(pending.label || '', row.label)
        })
        if (pendingDuplicate) {
          return {
            ...row,
            status: 'duplicate_pending' as const,
            decision: 'review' as const,
            match: null,
            duplicatePendingItemId: pendingDuplicate.id,
            duplicatePendingFileName: batchNameById.get(pendingDuplicate.batch_id) || null,
          }
        }

        if (row.nature === 'income') {
          const duplicate = (incomeResult.data || []).find((income: any) =>
            monthById.get(income.mois_id) === monthStart &&
            income.recu &&
            sameDateAmountLabel({
              sourceDate: row.date,
              sourceAmount: amount,
              sourceLabel: row.label,
              targetDate: income.date_reelle,
              targetAmount: income.montant,
              targetLabel: income.nom,
            })
          )
          if (duplicate) {
            return {
              ...row,
              status: 'duplicate',
              decision: 'review',
              match: {
                kind: 'duplicate_income',
                targetId: duplicate.id,
                label: duplicate.nom,
                detail: 'Revenu déjà reçu avec même date, montant et libellé proche.',
              },
            }
          }
          return { ...row, status: 'new', match: null, decision: 'create' }
        }

        if (row.nature === 'savings_deposit' || row.nature === 'savings_withdrawal') {
          const expectedType = row.nature === 'savings_deposit' ? 'epargne' : 'reprise'
          const duplicateSavings = (savingsResult.data || []).find((movement: any) =>
            monthById.get(movement.mois_id) === monthStart &&
            movement.type === expectedType &&
            movement.date === row.date &&
            sameAmount(movement.montant, amount)
          )
          if (duplicateSavings) {
            return {
              ...row,
              status: 'duplicate',
              decision: 'review',
              match: {
                kind: 'duplicate_savings',
                targetId: duplicateSavings.id,
                label: duplicateSavings.note || (expectedType === 'epargne' ? 'Versement épargne' : 'Reprise épargne'),
                detail: 'Mouvement d’épargne déjà présent avec même date et même montant.',
              },
            }
          }
          return { ...row, status: 'new', match: null, decision: 'create' }
        }

        const duplicateTransaction = (transactionResult.data || []).find((transaction: any) =>
          monthById.get(transaction.mois_id) === monthStart &&
          sameAmount(transaction.montant, amount) &&
          (transaction.date === row.date || transaction.date_validation === row.date) &&
          labelsClose(transaction.infos || '', row.label)
        )
        if (duplicateTransaction) {
          return {
            ...row,
            status: 'duplicate',
            decision: 'review',
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
          sameDateAmountLabel({
            sourceDate: row.date,
            sourceAmount: amount,
            sourceLabel: row.label,
            targetDate: fixed.date_reelle,
            targetAmount: fixed.montant_reel ?? fixed.montant,
            targetLabel: fixed.nom,
          })
        )
        if (paidFixed) {
          return {
            ...row,
            status: 'duplicate',
            decision: 'review',
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
          plausibleFixedMatch(fixed.montant, amount) &&
          labelsClose(fixed.nom || '', row.label)
        )
        if (fixedCandidate) {
          return {
            ...row,
            status: 'fixed_candidate',
            decision: 'review',
            match: {
              kind: 'fixed_candidate',
              targetId: fixedCandidate.id,
              label: fixedCandidate.nom,
              detail: amountDistance(fixedCandidate.montant, amount) < 0.01
                ? 'Cette ligne peut rapprocher exactement une charge fixe prévue au lieu de créer une nouvelle dépense.'
                : `Charge prévue ${cents(fixedCandidate.montant).toFixed(2)} € ; banque ${amount.toFixed(2)} € ; écart ${amountDistance(fixedCandidate.montant, amount).toFixed(2)} €.`,
              beforeState: {
                payee: fixedCandidate.payee,
                montant_reel: fixedCandidate.montant_reel,
                date_reelle: fixedCandidate.date_reelle,
              },
            },
          }
        }

        return { ...row, status: 'new', match: null, decision: 'create' }
      })

      const seen = new Map<string, number>()
      return analyzed.map(row => {
        if (row.nature === 'ignore' || row.nature === 'savings_internal') {
          return row
        }

        const signature = [
          row.nature,
          row.date,
          Math.abs(cents(row.amount)).toFixed(2),
          normalizeFinancialLabel(row.label),
        ].join('|')

        const firstRowIndex = seen.get(signature)
        if (firstRowIndex != null) {
          return {
            ...row,
            status: 'duplicate_in_file' as const,
            match: null,
            decision: 'review' as const,
            duplicateOfRowIndex: firstRowIndex,
          }
        }

        seen.set(signature, row.rowIndex)
        return row
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
      fileFingerprint,
      allowDuplicateFile,
    }: {
      rows: ImportPreviewRow[]
      fileName: string
      formatId?: string | null
      fileFingerprint?: string | null
      allowDuplicateFile?: boolean
    }) => {
      if (!espaceId || !userId) throw new Error('Budget ou utilisateur manquant')

      if (fileFingerprint && !allowDuplicateFile) {
        const { data: previous, error: previousError } = await supabase
          .from('import_batches')
          .select('id, file_name, created_at, status')
          .eq('espace_id', espaceId)
          .eq('file_fingerprint', fileFingerprint)
          .in('status', ['reviewing', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (previousError) throw previousError
        if (previous) {
          throw new Error('Ce fichier a déjà été enregistré dans ce Budget. Confirme explicitement si tu souhaites réellement le réimporter.')
        }
      }

      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          espace_id: espaceId,
          format_id: formatId || null,
          file_name: fileName,
          file_fingerprint: fileFingerprint || null,
          row_count: rows.length,
          status: 'reviewing',
          created_count: 0,
          matched_count: 0,
          ignored_count: 0,
          error_count: 0,
        })
        .select()
        .single()
      if (batchError) throw batchError

      const staged = rows.map(row => ({
        batch_id: batch.id,
        row_index: row.rowIndex,
        nature: row.nature,
        action: 'pending',
        raw: row,
      }))

      if (staged.length > 0) {
        const { error: itemsError } = await supabase.from('import_batch_items').insert(staged)
        if (itemsError) throw itemsError
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          espace_id: espaceId,
          family: 'actions',
          title: 'Import bancaire à vérifier',
          message: `${rows.length} opération(s) ont été enregistrée(s). Tu peux les classer maintenant ou reprendre plus tard.`,
          action_label: 'Valider les opérations',
          action_href: '/import-csv/validation',
          dedupe_key: `csv-review:${batch.id}`,
        })
      if (notificationError && notificationError.code !== '23505') {
        console.warn('Notification import CSV non créée:', notificationError)
      }

      return {
        batchId: batch.id,
        createdCount: 0,
        matchedCount: 0,
        ignoredCount: 0,
        errorCount: 0,
        pendingCount: rows.length,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] })
    },
  })

  async function refreshBatchProgress(batchId: string) {
    const { data: items, error } = await supabase
      .from('import_batch_items')
      .select('action')
      .eq('batch_id', batchId)
    if (error) throw error

    const createdCount = (items || []).filter(item => item.action === 'created').length
    const matchedCount = (items || []).filter(item => item.action === 'matched').length
    const ignoredCount = (items || []).filter(item => item.action === 'ignored').length
    const errorCount = (items || []).filter(item => item.action === 'error').length
    const pendingCount = (items || []).filter(item => item.action === 'pending').length

    const { error: updateError } = await supabase
      .from('import_batches')
      .update({
        status: pendingCount === 0 ? 'completed' : 'reviewing',
        created_count: createdCount,
        matched_count: matchedCount,
        ignored_count: ignoredCount,
        error_count: errorCount,
      })
      .eq('id', batchId)
    if (updateError) throw updateError

    return { createdCount, matchedCount, ignoredCount, errorCount, pendingCount }
  }

  const updatePendingItem = useMutation({
    mutationFn: async ({
      itemId,
      nature,
      raw,
    }: {
      itemId: string
      nature: ImportNature
      raw: Record<string, any>
    }) => {
      const { data, error } = await supabase
        .from('import_batch_items')
        .update({ nature, raw })
        .eq('id', itemId)
        .eq('action', 'pending')
        .select()
        .single()
      if (error) throw error
      return data
    },
  })

  const validatePendingItem = useMutation({
    mutationFn: async (item: any) => {
      if (!item || item.action !== 'pending') return null
      const row = item.raw as ImportPreviewRow
      const nature = item.nature as ImportNature

      if (row.decision === 'review') {
        throw new Error('Cette opération a un doublon ou un rapprochement potentiel : choisis explicitement Créer, Rapprocher ou Ignorer avant de la valider.')
      }

      if (row.decision === 'ignore' || nature === 'ignore' || nature === 'savings_internal') {
        const { error } = await supabase
          .from('import_batch_items')
          .update({ action: 'ignored', reviewed_at: new Date().toISOString() })
          .eq('id', item.id)
        if (error) throw error
        await refreshBatchProgress(item.batch_id)
        return { action: 'ignored' }
      }

      if (row.decision === 'match' && row.match) {
        const targetTable =
          row.match.kind === 'duplicate_income'
            ? 'revenus'
            : row.match.kind === 'duplicate_fixed' || row.match.kind === 'fixed_candidate'
              ? 'charges_fixes'
              : row.match.kind === 'duplicate_savings'
                ? 'mouvements_epargne'
                : 'transactions'

        let afterState: Record<string, any> | null = null
        let beforeState = row.match.beforeState || null

        if (row.status === 'fixed_candidate' && row.match.kind === 'fixed_candidate') {
          const { data: updatedFixed, error: fixedError } = await supabase
            .from('charges_fixes')
            .update({
              payee: true,
              montant_reel: Math.abs(row.amount),
              date_reelle: row.date,
            })
            .eq('id', row.match.targetId)
            .select('*')
            .single()
          if (fixedError) throw fixedError
          afterState = updatedFixed
        }

        const { error } = await supabase
          .from('import_batch_items')
          .update({
            action: 'matched',
            target_table: targetTable,
            target_id: row.match.targetId,
            before_state: beforeState,
            after_state: afterState,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        if (error) throw error
        await refreshBatchProgress(item.batch_id)
        return { action: 'matched' }
      }

      const month = await getOrCreateMonth(row.date)
      let targetTable = ''
      let created: any = null

      if (nature === 'income') {
        const { data, error } = await supabase.from('revenus').insert({
          mois_id: month.id,
          recurrent_id: null,
          type: row.incomeType || 'actif',
          nom: row.note ? `${row.label} — ${row.note}` : row.label,
          montant: Math.abs(row.amount),
          recu: true,
          date_prevue: row.operationDate || row.date,
          date_reelle: row.date,
          ordre: 0,
        }).select('*').single()
        if (error) throw error
        targetTable = 'revenus'
        created = data
      } else if (nature === 'savings_deposit' || nature === 'savings_withdrawal') {
        if (!row.envelopeId) throw new Error('Choisis une enveloppe avant de valider ce mouvement d’épargne.')
        const isDeposit = nature === 'savings_deposit'
        const { data, error } = await supabase.from('mouvements_epargne').insert({
          mois_id: month.id,
          recurrent_id: null,
          enveloppe_source_id: isDeposit ? null : row.envelopeId,
          enveloppe_dest_id: isDeposit ? row.envelopeId : null,
          montant: Math.abs(row.amount),
          type: isDeposit ? 'epargne' : 'reprise',
          date: row.date,
          note: row.note ? `${row.label} — ${row.note}` : row.label,
        }).select('*').single()
        if (error) throw error
        targetTable = 'mouvements_epargne'
        created = data
      } else if (nature === 'expense') {
        if (!row.categoryId) throw new Error('Choisis une catégorie avant de valider cette dépense.')
        const { data, error } = await supabase.from('transactions').insert({
          mois_id: month.id,
          categorie_id: row.categoryId,
          sous_categorie_id: row.subcategoryId || null,
          date: row.operationDate || row.date,
          date_validation: row.date,
          montant: Math.abs(row.amount),
          infos: row.note ? `${row.label} — ${row.note}` : row.label,
          is_split: false,
        }).select('*').single()
        if (error) throw error
        targetTable = 'transactions'
        created = data
      } else {
        throw new Error('Nature non prise en charge.')
      }

      const { error: itemError } = await supabase
        .from('import_batch_items')
        .update({
          nature,
          action: 'created',
          target_table: targetTable,
          target_id: created.id,
          after_state: created,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
      if (itemError) throw itemError

      await refreshBatchProgress(item.batch_id)
      return { action: 'created', targetTable, targetId: created.id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['mois', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['mouvements'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const loadPendingItems = useMutation({
    mutationFn: async () => {
      if (!espaceId) return []

      const { data: batches, error: batchesError } = await supabase
        .from('import_batches')
        .select('id, file_name, created_at, status')
        .eq('espace_id', espaceId)
        .eq('status', 'reviewing')
        .order('created_at', { ascending: true })
      if (batchesError) throw batchesError

      const ids = (batches || []).map(batch => batch.id)
      if (ids.length === 0) return []

      const { data: items, error } = await supabase
        .from('import_batch_items')
        .select('*')
        .in('batch_id', ids)
        .eq('action', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error

      const batchById = new Map((batches || []).map(batch => [batch.id, batch]))
      return (items || []).map(item => ({
        ...item,
        batch: batchById.get(item.batch_id) || null,
      }))
    },
  })

  const loadBatchItems = useMutation({
    mutationFn: async (batchId: string) => {
      const { data: items, error } = await supabase
        .from('import_batch_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('row_index', { ascending: true })
      if (error) throw error

      const byTable = new Map<string, string[]>()
      for (const item of items || []) {
        if (!item.target_table || !item.target_id) continue
        const list = byTable.get(item.target_table) || []
        list.push(item.target_id)
        byTable.set(item.target_table, list)
      }

      const targets = new Map<string, any>()
      const loaders = Array.from(byTable.entries()).map(async ([table, ids]) => {
        let query = supabase.from(table as any).select('*').in('id', ids)
        const { data, error: targetError } = await query
        if (targetError) throw targetError
        for (const row of data || []) targets.set(`${table}:${row.id}`, row)
      })
      await Promise.all(loaders)

      return (items || []).map(item => ({
        ...item,
        target: item.target_table && item.target_id
          ? targets.get(`${item.target_table}:${item.target_id}`) || null
          : null,
      }))
    },
  })

  const updateImportedTarget = useMutation({
    mutationFn: async ({
      itemId,
      targetTable,
      targetId,
      patch,
    }: {
      itemId: string
      targetTable: string
      targetId: string
      patch: Record<string, any>
    }) => {
      const allowedByTable: Record<string, string[]> = {
        transactions: ['montant', 'date', 'date_validation', 'infos', 'categorie_id', 'sous_categorie_id'],
        revenus: ['montant', 'nom', 'type', 'date_prevue', 'date_reelle'],
        mouvements_epargne: ['montant', 'date', 'note', 'enveloppe_source_id', 'enveloppe_dest_id'],
        charges_fixes: ['montant_reel', 'date_reelle', 'categorie_id', 'sous_categorie_id'],
      }
      const allowed = allowedByTable[targetTable] || []
      const clean = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)))
      if (Object.keys(clean).length === 0) return null

      const { data, error } = await supabase.from(targetTable as any).update(clean).eq('id', targetId).select('*').single()
      if (error) throw error

      const { error: itemError } = await supabase
        .from('import_batch_items')
        .update({ after_state: data })
        .eq('id', itemId)
      if (itemError) throw itemError
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['mouvements'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const reclassifyImportedItem = useMutation({
    mutationFn: async ({
      item,
      nature,
      categoryId,
      subcategoryId,
      envelopeId,
      incomeType,
    }: {
      item: any
      nature: ImportNature
      categoryId?: string | null
      subcategoryId?: string | null
      envelopeId?: string | null
      incomeType?: 'actif' | 'passif'
    }) => {
      if (item.action !== 'created' || !item.target_table || !item.target_id || !item.target) {
        throw new Error('Seules les opérations créées par cet import peuvent être reclassées ici.')
      }

      const current = item.target
      const amount = Math.abs(Number(current.montant ?? current.montant_reel ?? item.raw?.amount ?? 0))
      const operationDate = current.date ?? current.date_prevue ?? item.raw?.operationDate ?? item.raw?.date
      const validationDate = current.date_validation ?? current.date_reelle ?? item.raw?.date ?? operationDate
      const label = current.infos ?? current.nom ?? current.note ?? item.raw?.label ?? 'Opération importée'
      const monthId = current.mois_id
      if (!monthId) throw new Error('Mois de l’opération introuvable.')

      let targetTable = ''
      let created: any = null

      if (nature === 'expense') {
        if (!categoryId) throw new Error('Une catégorie est requise pour reclasser en dépense.')
        const { data, error } = await supabase.from('transactions').insert({
          mois_id: monthId,
          categorie_id: categoryId,
          sous_categorie_id: subcategoryId || null,
          date: operationDate,
          date_validation: validationDate,
          montant: amount,
          infos: label,
          is_split: false,
        }).select('*').single()
        if (error) throw error
        targetTable = 'transactions'
        created = data
      } else if (nature === 'income') {
        const { data, error } = await supabase.from('revenus').insert({
          mois_id: monthId,
          recurrent_id: null,
          type: incomeType || 'actif',
          nom: label,
          montant: amount,
          recu: true,
          date_prevue: operationDate,
          date_reelle: validationDate,
          ordre: 0,
        }).select('*').single()
        if (error) throw error
        targetTable = 'revenus'
        created = data
      } else if (nature === 'savings_deposit' || nature === 'savings_withdrawal') {
        if (!envelopeId) throw new Error('Une enveloppe est requise pour reclasser en épargne.')
        const isDeposit = nature === 'savings_deposit'
        const { data, error } = await supabase.from('mouvements_epargne').insert({
          mois_id: monthId,
          recurrent_id: null,
          enveloppe_source_id: isDeposit ? null : envelopeId,
          enveloppe_dest_id: isDeposit ? envelopeId : null,
          montant: amount,
          type: isDeposit ? 'epargne' : 'reprise',
          date: validationDate,
          note: label,
        }).select('*').single()
        if (error) throw error
        targetTable = 'mouvements_epargne'
        created = data
      } else {
        throw new Error('Cette nature ne peut pas être appliquée après import.')
      }

      const { error: deleteError } = await supabase.from(item.target_table as any).delete().eq('id', item.target_id)
      if (deleteError) {
        await supabase.from(targetTable as any).delete().eq('id', created.id)
        throw deleteError
      }

      const { error: itemError } = await supabase.from('import_batch_items').update({
        nature,
        target_table: targetTable,
        target_id: created.id,
        after_state: created,
      }).eq('id', item.id)
      if (itemError) throw itemError

      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['mouvements'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
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

      // Safety preflight: an import lot is reversible only while the objects it
      // created or changed are still exactly in the state left by the import.
      // Refuse the whole undo before deleting/restoring anything if the user
      // edited one of those objects afterwards.
      for (const item of items || []) {
        if (!item.after_state || !item.target_table || !item.target_id) continue

        let current: Record<string, any> | null = null
        if (item.target_table === 'revenus') {
          const { data, error } = await supabase
            .from('revenus')
            .select('id, mois_id, recurrent_id, type, nom, montant, recu, date_prevue, date_reelle, ordre')
            .eq('id', item.target_id)
            .maybeSingle()
          if (error) throw error
          current = data
        } else if (item.target_table === 'transactions') {
          const { data, error } = await supabase
            .from('transactions')
            .select('id, mois_id, categorie_id, sous_categorie_id, date, date_validation, montant, infos, is_split, parent_transaction_id')
            .eq('id', item.target_id)
            .maybeSingle()
          if (error) throw error
          current = data
        } else if (item.target_table === 'mouvements_epargne') {
          const { data, error } = await supabase
            .from('mouvements_epargne')
            .select('id, mois_id, recurrent_id, enveloppe_source_id, enveloppe_dest_id, montant, type, date, note')
            .eq('id', item.target_id)
            .maybeSingle()
          if (error) throw error
          current = data
        } else if (item.target_table === 'charges_fixes' && item.before_state) {
          const { data, error } = await supabase
            .from('charges_fixes')
            .select('id, payee, montant_reel, date_reelle')
            .eq('id', item.target_id)
            .maybeSingle()
          if (error) throw error
          current = data
        }

        if (!current || !snapshotMatches(current, item.after_state)) {
          throw new Error(
            'Annulation refusée : au moins une opération de ce lot a été modifiée après l’import. ' +
            'Le lot est conservé pour éviter d’effacer une modification plus récente.'
          )
        }
      }

      for (const item of items || []) {
        if (item.action === 'created' && item.target_table && item.target_id) {
          if (item.target_table === 'revenus') {
            const { error } = await supabase.from('revenus').delete().eq('id', item.target_id)
            if (error) throw error
          } else if (item.target_table === 'transactions') {
            const { error } = await supabase.from('transactions').delete().eq('id', item.target_id)
            if (error) throw error
          } else if (item.target_table === 'mouvements_epargne') {
            const { error } = await supabase.from('mouvements_epargne').delete().eq('id', item.target_id)
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

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          espace_id: espaceId,
          family: 'neyguichen',
          title: 'Import CSV annulé',
          message: 'Les opérations réversibles du lot ont été restaurées ou supprimées en toute sécurité.',
          action_label: 'Voir les imports',
          action_href: '/import-csv',
          dedupe_key: `csv-undo:${batchId}`,
        })
      if (notificationError && notificationError.code !== '23505') {
        console.warn('Notification annulation CSV non créée:', notificationError)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
      queryClient.invalidateQueries({ queryKey: ['mouvements'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', espaceId] })
    },
  })

  return {
    formats,
    history,
    saveFormat,
    checkFingerprint,
    analyze,
    importRows,
    loadPendingItems,
    loadBatchItems,
    updatePendingItem,
    validatePendingItem,
    updateImportedTarget,
    reclassifyImportedItem,
    undoBatch,
  }
}
