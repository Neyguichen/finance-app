'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, Filter, Search } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useEnveloppes } from '@/lib/hooks/useEpargne'
import { useCsvImport, type ImportPreviewRow } from '@/lib/hooks/useCsvImport'
import type { ImportNature } from '@/lib/import-csv'
import { formatEuro } from '@/lib/utils'

type ReviewRow = any & {
  analysis?: ImportPreviewRow
}

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function ImportedTransactionsValidationPage() {
  const [requestedBatchId, setRequestedBatchId] = useState<string | null>(null)

  useEffect(() => {
    setRequestedBatchId(new URLSearchParams(window.location.search).get('batch'))
  }, [])
  const { espace, userId, isAdminViewing } = useApp()
  const importModel = useCsvImport(espace?.id, userId)
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: envelopes = [] } = useEnveloppes(espace?.id)

  const [rows, setRows] = useState<ReviewRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [fileFilter, setFileFilter] = useState('')
  const [bulkNature, setBulkNature] = useState<ImportNature | ''>('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkSubcategory, setBulkSubcategory] = useState('')
  const [bulkEnvelope, setBulkEnvelope] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const batch = useMemo(() => {
    if (!requestedBatchId) return null
    return (importModel.history.data || []).find(item => item.id === requestedBatchId) || null
  }, [importModel.history.data, requestedBatchId])

  const activeParents = useMemo(
    () => categories.filter(category => category.actif !== false && !category.parent_id),
    [categories]
  )

  const bulkSubcategories = useMemo(
    () => categories.filter(category => category.actif !== false && category.parent_id === bulkCategory),
    [categories, bulkCategory]
  )

  const refresh = async () => {
    const loaded = requestedBatchId && batch?.id
      ? await importModel.loadBatchItems.mutateAsync(batch.id)
      : await importModel.loadPendingItems.mutateAsync()

    const pending = loaded.filter((item: any) => item.action === 'pending')

    let analyzed: ImportPreviewRow[] = []
    if (pending.length > 0) {
      analyzed = await importModel.analyze.mutateAsync(
        pending.map((item: any) => ({
          ...item.raw,
          _pendingItemId: item.id,
        }))
      )
    }

    const byItemId = new Map<string, ImportPreviewRow>()
    pending.forEach((item: any, index: number) => {
      if (analyzed[index]) byItemId.set(item.id, analyzed[index])
    })

    const nextRows = loaded.map((item: any) => ({
      ...item,
      analysis: item.action === 'pending' ? byItemId.get(item.id) || item.raw : undefined,
    }))

    setRows(current => {
      if (current.length === 0) return nextRows

      // Keep every already displayed transaction at the same visual position.
      // Saves and duplicate re-analysis must never make a row jump while the
      // user is editing it. Newly imported rows are appended afterwards.
      const nextById = new Map(nextRows.map((item: any) => [item.id, item]))
      const stable = current
        .map(item => nextById.get(item.id))
        .filter(Boolean) as ReviewRow[]
      const knownIds = new Set(stable.map(item => item.id))
      const appended = nextRows.filter((item: any) => !knownIds.has(item.id))

      return [...stable, ...appended]
    })
  }

  useEffect(() => {
    if (!requestedBatchId || batch?.id) refresh()
  }, [requestedBatchId, batch?.id])

  const pendingRows = rows.filter(row => row.action === 'pending')

  const pendingDuplicateKeys = useMemo(() => {
    const seen = new Map<string, string>()
    const duplicates = new Set<string>()
    for (const row of pendingRows) {
      const source = row.analysis || row.raw
      const key = [
        source.date,
        Math.abs(Number(source.amount || 0)).toFixed(2),
        normalize(source.label),
      ].join('|')
      const first = seen.get(key)
      if (first) {
        duplicates.add(first)
        duplicates.add(row.id)
      } else {
        seen.set(key, row.id)
      }
    }
    return duplicates
  }, [pendingRows])

  const rowNeedsAssignment = (row: ReviewRow) => {
    if (row.action !== 'pending') return false
    const source = row.analysis || row.raw
    const nature = row.nature as ImportNature
    if (source.decision === 'review') return true
    if (source.decision === 'ignore' || nature === 'ignore' || nature === 'savings_internal') return false
    if (source.decision === 'match' && source.match) return false
    if (nature === 'expense') return !source.categoryId
    if (nature === 'savings_deposit' || nature === 'savings_withdrawal') return !source.envelopeId
    return false
  }

  const rowHasIssue = (row: ReviewRow) => {
    if (row.action !== 'pending') return false
    const source = row.analysis || row.raw
    return rowNeedsAssignment(row) ||
      pendingDuplicateKeys.has(row.id) ||
      source.status === 'duplicate' ||
      source.status === 'duplicate_in_file' ||
      source.status === 'fixed_candidate'
  }

  const fileOptions = Array.from(new Map(
    rows
      .filter(row => row.batch?.id)
      .map(row => [row.batch.id, row.batch.file_name || 'Import CSV'])
  ).entries())

  const filteredRows = rows.filter(row => {
    const source = row.analysis || row.raw || {}
    const haystack = [source.label, source.note, source.categoryName, source.subcategoryName].join(' ').toLocaleLowerCase('fr-FR')
    if (query.trim() && !haystack.includes(query.trim().toLocaleLowerCase('fr-FR'))) return false
    if (fileFilter && row.batch?.id !== fileFilter) return false
    if (onlyIssues && !rowHasIssue(row)) return false
    return true
  })

  const savePending = async (row: ReviewRow, patch: Partial<ImportPreviewRow> & { nature?: ImportNature }) => {
    if (row.action !== 'pending') return
    const current = { ...(row.analysis || row.raw), ...patch }
    const nature = patch.nature || row.nature
    await importModel.updatePendingItem.mutateAsync({
      itemId: row.id,
      nature,
      raw: current,
    })
    await refresh()
  }

  const validateOne = async (row: ReviewRow) => {
    if (row.action !== 'pending') return
    const analyzed = row.analysis || row.raw
    if (rowNeedsAssignment(row)) {
      setMessage('Cette opération doit encore être affectée avant validation.')
      return
    }

    const saved = await importModel.updatePendingItem.mutateAsync({
      itemId: row.id,
      nature: row.nature,
      raw: analyzed,
    })
    await importModel.validatePendingItem.mutateAsync(saved)
  }

  const validateRows = async (targetRows: ReviewRow[]) => {
    setMessage(null)
    let validated = 0
    let skipped = 0
    for (const row of targetRows) {
      if (row.action !== 'pending') continue
      if (rowNeedsAssignment(row)) {
        skipped += 1
        continue
      }
      await validateOne(row)
      validated += 1
    }
    setSelectedIds([])
    await refresh()
    setMessage(skipped > 0
      ? `${validated} opération(s) validée(s), ${skipped} laissée(s) à compléter.`
      : `${validated} opération(s) validée(s).`)
  }

  const applyBulk = async () => {
    const selected = pendingRows.filter(row => selectedIds.includes(row.id))
    if (selected.length === 0) return

    for (const row of selected) {
      const source = row.analysis || row.raw
      const nextNature = bulkNature || row.nature
      const patch: any = {
        ...source,
        nature: nextNature,
      }

      if (bulkCategory) {
        patch.categoryId = bulkCategory
        patch.subcategoryId = bulkSubcategory || null
      }
      if (bulkEnvelope) patch.envelopeId = bulkEnvelope

      await importModel.updatePendingItem.mutateAsync({
        itemId: row.id,
        nature: nextNature,
        raw: patch,
      })
    }

    await refresh()
    setMessage(`${selected.length} opération(s) mise(s) à jour.`)
  }

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">La validation des imports est désactivée en vue administrateur.</div>
  }

  const pendingCount = pendingRows.length
  const readyCount = pendingRows.filter(row => !rowNeedsAssignment(row)).length
  const issueCount = pendingRows.filter(rowHasIssue).length

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-3 pb-24 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/import-csv" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Retour aux imports
          </Link>
          <h1 className="text-2xl font-semibold">Transactions importées à valider</h1>
          <p className="mt-1 text-sm text-slate-500">
            {requestedBatchId && batch
              ? `${batch.file_name || 'Import CSV'} · consultation d’un lot précis.`
              : 'File globale de toutes les transactions importées encore à valider. Ton avancement est enregistré à chaque modification.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="À valider" value={pendingCount} />
          <MiniStat label="Prêtes" value={readyCount} />
          <MiniStat label="À vérifier" value={issueCount} />
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-3 text-sm text-indigo-200">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-8 h-4 w-4 text-slate-600" />
            <span className="mb-1 block text-xs text-slate-500">Rechercher</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="input input-bordered input-sm w-full bg-slate-950 pl-9"
              placeholder="Libellé, note, catégorie…"
            />
          </label>

          {!requestedBatchId && fileOptions.length > 1 && (
            <label>
              <span className="mb-1 block text-xs text-slate-500">Fichier</span>
              <select className="select select-bordered select-sm min-w-52 bg-slate-950" value={fileFilter} onChange={event => setFileFilter(event.target.value)}>
                <option value="">Tous les fichiers</option>
                {fileOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}

          <label className="flex h-8 cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" className="checkbox checkbox-xs" checked={onlyIssues} onChange={event => setOnlyIssues(event.target.checked)} />
            <Filter className="h-3.5 w-3.5" /> Uniquement à vérifier
          </label>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pendingCount === 0 || importModel.validatePendingItem.isPending}
            onClick={() => validateRows(pendingRows.filter(row => !rowNeedsAssignment(row)))}
          >
            <Check className="h-4 w-4" />
            Valider toutes les opérations prêtes
          </button>
        </div>
      </section>

      {pendingCount > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex h-8 items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={pendingRows.length > 0 && selectedIds.length === pendingRows.length}
                onChange={event => setSelectedIds(event.target.checked ? pendingRows.map(row => row.id) : [])}
              />
              Tout sélectionner
            </label>

            <Field label="Nature">
              <select className="select select-bordered select-xs min-w-40 bg-slate-950" value={bulkNature} onChange={event => setBulkNature(event.target.value as ImportNature | '')}>
                <option value="">Ne pas modifier</option>
                <option value="expense">Dépense</option>
                <option value="income">Revenu</option>
                <option value="savings_deposit">Versement épargne</option>
                <option value="savings_withdrawal">Reprise épargne</option>
                <option value="ignore">Ignorer</option>
              </select>
            </Field>

            <Field label="Catégorie">
              <select className="select select-bordered select-xs min-w-44 bg-slate-950" value={bulkCategory} onChange={event => { setBulkCategory(event.target.value); setBulkSubcategory('') }}>
                <option value="">Ne pas modifier</option>
                {activeParents.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
              </select>
            </Field>

            <Field label="Sous-catégorie">
              <select className="select select-bordered select-xs min-w-44 bg-slate-950" value={bulkSubcategory} onChange={event => setBulkSubcategory(event.target.value)} disabled={!bulkCategory}>
                <option value="">Aucune / ne pas modifier</option>
                {bulkSubcategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
              </select>
            </Field>

            <Field label="Enveloppe">
              <select className="select select-bordered select-xs min-w-44 bg-slate-950" value={bulkEnvelope} onChange={event => setBulkEnvelope(event.target.value)}>
                <option value="">Ne pas modifier</option>
                {envelopes.filter(envelope => !envelope.archived).map(envelope => <option key={envelope.id} value={envelope.id}>{envelope.nom}</option>)}
              </select>
            </Field>

            <button type="button" className="btn btn-outline btn-sm" disabled={selectedIds.length === 0} onClick={applyBulk}>
              Appliquer à {selectedIds.length}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={selectedIds.length === 0} onClick={() => validateRows(pendingRows.filter(row => selectedIds.includes(row.id)))}>
              <Check className="h-4 w-4" /> Valider la sélection
            </button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        {filteredRows.map(row => {
          const source = row.analysis || row.raw || {}
          const pending = row.action === 'pending'
          const categoryId = source.categoryId || ''
          const subcategories = categories.filter(category => category.actif !== false && category.parent_id === categoryId)
          const duplicatePending = pendingDuplicateKeys.has(row.id)
          const validatedDuplicate = source.status === 'duplicate'
          const csvDuplicate = source.status === 'duplicate_in_file'
          const fixedCandidate = source.status === 'fixed_candidate'

          return (
            <article key={row.id} className={`rounded-xl border p-3 ${rowHasIssue(row) ? 'border-amber-800/60 bg-amber-950/10' : 'border-slate-800 bg-slate-900'}`}>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                {!requestedBatchId && row.batch?.file_name && (
                  <div className="xl:w-36 xl:pt-5">
                    <span className="badge badge-sm badge-ghost max-w-full truncate" title={row.batch.file_name}>
                      {row.batch.file_name}
                    </span>
                  </div>
                )}
                <div className="pt-6">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    disabled={!pending}
                    checked={selectedIds.includes(row.id)}
                    onChange={event => setSelectedIds(current => event.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))}
                  />
                </div>

                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <Field label="Date opération">
                    <input
                      type="date"
                      className="input input-bordered input-xs w-full bg-slate-950"
                      value={source.operationDate || source.date || ''}
                      disabled={!pending}
                      onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, analysis: { ...source, operationDate: event.target.value } } : item))}
                      onBlur={event => pending && savePending(row, { operationDate: event.target.value })}
                    />
                  </Field>

                  <Field label="Date validation">
                    <input
                      type="date"
                      className="input input-bordered input-xs w-full bg-slate-950"
                      value={source.date || ''}
                      disabled={!pending}
                      onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, analysis: { ...source, date: event.target.value } } : item))}
                      onBlur={event => pending && savePending(row, { date: event.target.value })}
                    />
                  </Field>

                  <Field label="Libellé" className="lg:col-span-2">
                    <input
                      className="input input-bordered input-xs w-full bg-slate-950"
                      value={source.label || ''}
                      disabled={!pending}
                      onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, analysis: { ...source, label: event.target.value } } : item))}
                      onBlur={event => pending && savePending(row, { label: event.target.value })}
                    />
                  </Field>

                  <Field label="Montant">
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered input-xs w-full bg-slate-950"
                      value={source.amount ?? ''}
                      disabled={!pending}
                      onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, analysis: { ...source, amount: Number(event.target.value) } } : item))}
                      onBlur={event => pending && savePending(row, { amount: Number(event.target.value) })}
                    />
                  </Field>

                  <Field label="Nature">
                    <select
                      className="select select-bordered select-xs w-full bg-slate-950"
                      value={row.nature}
                      disabled={!pending}
                      onChange={event => savePending(row, { nature: event.target.value as ImportNature })}
                    >
                      <option value="expense">Dépense</option>
                      <option value="income">Revenu</option>
                      <option value="savings_deposit">Versement épargne</option>
                      <option value="savings_withdrawal">Reprise épargne</option>
                      <option value="savings_internal">Transfert interne</option>
                      <option value="ignore">Ignorer</option>
                    </select>
                  </Field>

                  {row.nature === 'expense' && (
                    <>
                      <Field label="Catégorie">
                        <select className="select select-bordered select-xs w-full bg-slate-950" value={categoryId} disabled={!pending} onChange={event => savePending(row, { categoryId: event.target.value || null, subcategoryId: null })}>
                          <option value="">À choisir…</option>
                          {activeParents.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                        </select>
                      </Field>
                      <Field label="Sous-catégorie">
                        <select className="select select-bordered select-xs w-full bg-slate-950" value={source.subcategoryId || ''} disabled={!pending || !categoryId} onChange={event => savePending(row, { subcategoryId: event.target.value || null })}>
                          <option value="">Sans sous-catégorie</option>
                          {subcategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                        </select>
                      </Field>
                    </>
                  )}

                  {(row.nature === 'savings_deposit' || row.nature === 'savings_withdrawal') && (
                    <Field label="Enveloppe">
                      <select className="select select-bordered select-xs w-full bg-slate-950" value={source.envelopeId || ''} disabled={!pending} onChange={event => savePending(row, { envelopeId: event.target.value || null })}>
                        <option value="">À choisir…</option>
                        {envelopes.filter(envelope => !envelope.archived).map(envelope => <option key={envelope.id} value={envelope.id}>{envelope.nom}</option>)}
                      </select>
                    </Field>
                  )}

                  {row.nature === 'income' && (
                    <Field label="Type de revenu">
                      <select className="select select-bordered select-xs w-full bg-slate-950" value={source.incomeType || 'actif'} disabled={!pending} onChange={event => savePending(row, { incomeType: event.target.value as 'actif' | 'passif' })}>
                        <option value="actif">Actif</option>
                        <option value="passif">Passif</option>
                      </select>
                    </Field>
                  )}

                  <Field label="Note" className="lg:col-span-2">
                    <input
                      className="input input-bordered input-xs w-full bg-slate-950"
                      value={source.note || ''}
                      disabled={!pending}
                      onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, analysis: { ...source, note: event.target.value } } : item))}
                      onBlur={event => pending && savePending(row, { note: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="flex min-w-44 flex-col items-stretch gap-2 xl:pt-5">
                  {pending && (source.decision === 'review' || source.match || source.status === 'duplicate_in_file') && (
                    <select className="select select-bordered select-xs bg-slate-950" value={source.decision || 'review'} onChange={event => savePending(row, { decision: event.target.value as any })}>
                      <option value="review">À décider…</option>
                      <option value="create">Créer quand même</option>
                      {source.match && <option value="match">Rapprocher</option>}
                      <option value="ignore">Ignorer</option>
                    </select>
                  )}

                  {pending ? (
                    <button type="button" className="btn btn-primary btn-xs" disabled={rowNeedsAssignment(row)} onClick={() => validateRows([row])}>
                      <Check className="h-3.5 w-3.5" /> Valider
                    </button>
                  ) : (
                    <span className="badge badge-sm badge-outline self-start">
                      {row.action === 'created' ? 'Validée' : row.action === 'matched' ? 'Rapprochée' : row.action === 'ignored' ? 'Ignorée' : 'Erreur'}
                    </span>
                  )}
                </div>
              </div>

              {(duplicatePending || validatedDuplicate || csvDuplicate || fixedCandidate || rowNeedsAssignment(row)) && (
                <div className="mt-3 flex flex-wrap gap-2 pl-0 text-[11px] xl:pl-7">
                  {duplicatePending && <Issue icon={Copy} text="Doublon potentiel avec une autre transaction à valider" />}
                  {validatedDuplicate && <Issue icon={Copy} text={source.match?.detail || 'Doublon potentiel avec une transaction déjà validée'} />}
                  {csvDuplicate && <Issue icon={Copy} text="Doublon détecté dans le fichier importé" />}
                  {fixedCandidate && <Issue icon={AlertTriangle} text={source.match?.detail || 'Rapprochement possible avec une charge fixe'} />}
                  {rowNeedsAssignment(row) && <Issue icon={AlertTriangle} text="Affectation nécessaire avant validation" />}
                </div>
              )}
            </article>
          )
        })}

        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
            Aucune opération ne correspond aux filtres.
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[10px] text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <p className="text-[10px] text-slate-600">{label}</p>
      <p className="text-lg font-semibold text-slate-200">{value}</p>
    </div>
  )
}

function Issue({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/50 bg-amber-950/30 px-2 py-1 text-amber-300">
      <Icon className="h-3 w-3" /> {text}
    </span>
  )
}
