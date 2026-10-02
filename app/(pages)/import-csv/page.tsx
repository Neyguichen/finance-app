'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, RotateCcw, Save, Upload } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useEnveloppes } from '@/lib/hooks/useEpargne'
import { useCsvImport, type ImportDecision, type ImportPreviewRow } from '@/lib/hooks/useCsvImport'
import {
  fingerprintCsv,
  mapCsvRows,
  parseCsv,
  type CsvMapping,
  type ImportNature,
  type ParsedCsv,
} from '@/lib/import-csv'
import { formatDate, formatEuro } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'

const natureLabels: Record<ImportNature, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  savings_deposit: 'Versement épargne',
  savings_withdrawal: 'Reprise épargne',
  savings_internal: 'Transfert interne neutre',
  ignore: 'Ignorer',
}

function guessColumn(headers: string[], terms: string[]) {
  const normalized = headers.map(header => ({
    header,
    value: header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  }))
  return normalized.find(item => terms.some(term => item.value.includes(term)))?.header || ''
}

export default function ImportCsvPage() {
  const { espace, userId, isAdminViewing } = useApp()
  const enabled = espace?.features?.import_csv !== false
  const { data: categories = [] } = useCategories(enabled ? espace?.id : undefined)
  const { data: envelopes = [] } = useEnveloppes(enabled ? espace?.id : undefined)
  const importModel = useCsvImport(enabled ? espace?.id : undefined, userId)

  const [fileName, setFileName] = useState('')
  const [fileText, setFileText] = useState('')
  const [fileFingerprint, setFileFingerprint] = useState('')
  const [duplicateFileBatch, setDuplicateFileBatch] = useState<{ file_name: string | null; created_at: string } | null>(null)
  const [allowDuplicateFile, setAllowDuplicateFile] = useState(false)
  const [parsed, setParsed] = useState<ParsedCsv>({ headers: [], rows: [], delimiter: ';' })
  const [mapping, setMapping] = useState<CsvMapping>({ date: '', label: '', amount: '' })
  const [formatName, setFormatName] = useState('')
  const [selectedFormatId, setSelectedFormatId] = useState('')
  const [preview, setPreview] = useState<ImportPreviewRow[]>([])
  const [invalidRows, setInvalidRows] = useState<Array<{ rowIndex: number; reason: string }>>([])
  const [defaultCategory, setDefaultCategory] = useState('')
  const [lastResult, setLastResult] = useState<{ createdCount: number; matchedCount: number; ignoredCount: number; errorCount: number } | null>(null)
  const [reviewBatchId, setReviewBatchId] = useState<string | null>(null)
  const [reviewRows, setReviewRows] = useState<any[]>([])
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [bulkNature, setBulkNature] = useState<ImportNature | ''>('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkSubcategory, setBulkSubcategory] = useState('')
  const [bulkEnvelope, setBulkEnvelope] = useState('')

  const previewPeriod = useMemo(() => {
    if (preview.length === 0) return null
    const dates = preview.map(row => row.date).sort()
    return { start: dates[0], end: dates[dates.length - 1] }
  }, [preview])

  const activeParentCategories = useMemo(
    () => categories.filter(category => category.actif !== false && !category.parent_id),
    [categories]
  )

  const loadParsed = (text: string, delimiter?: string) => {
    const result = parseCsv(text, delimiter)
    setParsed(result)
    const guessedOperationDate = guessColumn(result.headers, ['date operation', 'date transaction', 'operation date'])
    const guessedValidationDate =
      guessColumn(result.headers, ['date valeur', 'date comptable', 'date validation', 'validation date']) ||
      guessColumn(result.headers, ['date'])
    const nextMapping: CsvMapping = {
      date: guessedValidationDate || guessedOperationDate,
      operationDate: guessedOperationDate && guessedOperationDate !== guessedValidationDate ? guessedOperationDate : '',
      label: guessColumn(result.headers, ['libelle', 'description', 'intitule', 'label', 'memo']),
      amount: guessColumn(result.headers, ['montant', 'amount', 'somme']),
      debit: guessColumn(result.headers, ['debit']),
      credit: guessColumn(result.headers, ['credit']),
      category: guessColumn(result.headers, ['categorie', 'category']),
      subcategory: guessColumn(result.headers, ['sous categorie', 'sous-categorie', 'subcategory']),
      nature: guessColumn(result.headers, ['nature', 'type operation', 'type']),
      note: guessColumn(result.headers, ['note', 'commentaire', 'memo complementaire']),
      incomeType: guessColumn(result.headers, ['type revenu', 'revenu actif', 'revenu passif']),
      envelope: guessColumn(result.headers, ['enveloppe', 'epargne', 'savings envelope']),
    }
    setMapping(nextMapping)
    setPreview([])
    setInvalidRows([])
    setLastResult(null)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setFileText(text)
    setSelectedFormatId('')
    setFormatName('')
    setAllowDuplicateFile(false)
    setDuplicateFileBatch(null)
    loadParsed(text)

    try {
      const fingerprint = await fingerprintCsv(text)
      setFileFingerprint(fingerprint)
      const previous = await importModel.checkFingerprint.mutateAsync(fingerprint)
      setDuplicateFileBatch(previous ? {
        file_name: previous.file_name,
        created_at: previous.created_at,
      } : null)
    } catch {
      setFileFingerprint('')
      setDuplicateFileBatch(null)
    }
  }

  const applySavedFormat = (formatId: string) => {
    setSelectedFormatId(formatId)
    const format = importModel.formats.data?.find(item => item.id === formatId)
    if (!format || !fileText) return
    const reparsed = parseCsv(fileText, format.delimiter)
    setParsed(reparsed)
    setMapping(format.mapping)
    setFormatName(format.name)
    setPreview([])
    setInvalidRows([])
  }

  const buildPreview = async () => {
    const result = mapCsvRows(parsed.rows, mapping)
    setInvalidRows(result.invalid)

    const normalize = (value: string | null | undefined) =>
      (value || '').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const enriched = result.valid.map(row => {
      const parent = row.categoryName
        ? categories.find(category => !category.parent_id && normalize(category.nom) === normalize(row.categoryName))
        : null
      const subcategory = row.subcategoryName
        ? categories.find(category =>
            category.parent_id === (parent?.id || null) &&
            normalize(category.nom) === normalize(row.subcategoryName)
          )
        : null
      const envelope = row.envelopeName
        ? envelopes.find(item => !item.archived && normalize(item.nom) === normalize(row.envelopeName))
        : null

      return {
        ...row,
        categoryId: row.nature === 'expense'
          ? (parent?.id || (defaultCategory || row.categoryId))
          : row.categoryId,
        subcategoryId: row.nature === 'expense' ? (subcategory?.id || null) : null,
        envelopeId: (row.nature === 'savings_deposit' || row.nature === 'savings_withdrawal')
          ? (envelope?.id || row.envelopeId)
          : row.envelopeId,
      }
    })

    const analyzed = await importModel.analyze.mutateAsync(enriched)
    setPreview(analyzed)
    setLastResult(null)
  }

  const updateRow = (rowIndex: number, changes: Partial<ImportPreviewRow>) => {
    setPreview(current => current.map(row => {
      if (row.rowIndex !== rowIndex) return row
      const natureChanged = changes.nature && changes.nature !== row.nature
      return {
        ...row,
        ...changes,
        ...(natureChanged ? {
          status: 'new' as const,
          match: null,
          decision: changes.nature === 'ignore' || changes.nature === 'savings_internal' ? 'ignore' as const : 'create' as const,
          categoryId: changes.nature === 'expense' ? row.categoryId : null,
          envelopeId: changes.nature === 'savings_deposit' || changes.nature === 'savings_withdrawal' ? row.envelopeId : null,
        } : {}),
      }
    }))
  }

  const applyDefaultCategory = (categoryId: string) => {
    setDefaultCategory(categoryId)
    setPreview(current => current.map(row =>
      row.nature === 'expense' && row.decision === 'create'
        ? { ...row, categoryId }
        : row
    ))
  }

  const missingCategoryCount = preview.filter(
    row => row.nature === 'expense' && row.decision === 'create' && !row.categoryId
  ).length

  const missingEnvelopeCount = preview.filter(
    row =>
      (row.nature === 'savings_deposit' || row.nature === 'savings_withdrawal') &&
      row.decision === 'create' &&
      !row.envelopeId
  ).length

  const missingAssignmentCount = missingCategoryCount + missingEnvelopeCount

  const saveCurrentFormat = async () => {
    if (!formatName.trim()) return
    const saved = await importModel.saveFormat.mutateAsync({
      name: formatName.trim(),
      delimiter: parsed.delimiter,
      mapping,
    })
    setSelectedFormatId(saved.id)
  }

  const duplicateFileBlocked = Boolean(duplicateFileBatch && !allowDuplicateFile)

  const reviewSubcategories = useMemo(
    () => categories.filter(category => category.parent_id === bulkCategory && category.actif !== false),
    [categories, bulkCategory]
  )

  const loadReview = async (batchId: string) => {
    const rows = await importModel.loadBatchItems.mutateAsync(batchId)
    setReviewBatchId(batchId)
    setReviewRows(rows)
    setSelectedReviewIds([])
  }

  const refreshReview = async () => {
    if (!reviewBatchId) return
    const rows = await importModel.loadBatchItems.mutateAsync(reviewBatchId)
    setReviewRows(rows)
  }

  const updateReviewTarget = async (row: any, patch: Record<string, any>) => {
    if (!row.target_table || !row.target_id) return
    await importModel.updateImportedTarget.mutateAsync({
      itemId: row.id,
      targetTable: row.target_table,
      targetId: row.target_id,
      patch,
    })
    await refreshReview()
  }

  const reclassifyReviewRow = async (row: any, nature: ImportNature, overrides?: {
    categoryId?: string | null
    subcategoryId?: string | null
    envelopeId?: string | null
  }) => {
    if (nature === row.nature) return
    await importModel.reclassifyImportedItem.mutateAsync({
      item: row,
      nature,
      categoryId: overrides?.categoryId ?? row.target?.categorie_id ?? null,
      subcategoryId: overrides?.subcategoryId ?? row.target?.sous_categorie_id ?? null,
      envelopeId: overrides?.envelopeId ??
        row.target?.enveloppe_dest_id ??
        row.target?.enveloppe_source_id ??
        null,
      incomeType: row.target?.type === 'passif' ? 'passif' : 'actif',
    })
    await refreshReview()
  }

  const applyBulkReview = async () => {
    const selected = reviewRows.filter(row => selectedReviewIds.includes(row.id))
    for (const row of selected) {
      if (bulkNature && bulkNature !== row.nature) {
        await importModel.reclassifyImportedItem.mutateAsync({
          item: row,
          nature: bulkNature,
          categoryId: bulkCategory || row.target?.categorie_id || null,
          subcategoryId: bulkSubcategory || null,
          envelopeId: bulkEnvelope || row.target?.enveloppe_dest_id || row.target?.enveloppe_source_id || null,
          incomeType: row.target?.type === 'passif' ? 'passif' : 'actif',
        })
        continue
      }

      if (row.target_table === 'transactions' && bulkCategory) {
        await importModel.updateImportedTarget.mutateAsync({
          itemId: row.id,
          targetTable: row.target_table,
          targetId: row.target_id,
          patch: {
            categorie_id: bulkCategory,
            sous_categorie_id: bulkSubcategory || null,
          },
        })
      } else if (row.target_table === 'mouvements_epargne' && bulkEnvelope) {
        const isDeposit = row.nature === 'savings_deposit'
        await importModel.updateImportedTarget.mutateAsync({
          itemId: row.id,
          targetTable: row.target_table,
          targetId: row.target_id,
          patch: {
            enveloppe_source_id: isDeposit ? null : bulkEnvelope,
            enveloppe_dest_id: isDeposit ? bulkEnvelope : null,
          },
        })
      }
    }
    await refreshReview()
  }

  const confirmImport = async () => {
    if (!fileName || preview.length === 0 || missingAssignmentCount > 0 || duplicateFileBlocked) return
    const result = await importModel.importRows.mutateAsync({
      rows: preview,
      fileName,
      formatId: selectedFormatId || null,
      fileFingerprint: fileFingerprint || null,
      allowDuplicateFile,
    })
    setLastResult(result)
    setPreview([])
  }

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">L’import CSV est désactivé en vue administrateur.</div>
  }

  if (!enabled) {
    return <div className="p-4 text-sm text-slate-400">L’import CSV est désactivé pour ce Budget. Tu peux le réactiver dans Paramètres → Fonctionnalités du Budget.</div>
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-24 sm:p-4">
      <PageHeader
        eyebrow="Rapprochement"
        title="Importer un relevé CSV"
        description="Confronte Neyguichen à la réalité bancaire avec une prévisualisation obligatoire, des choix explicites et un contrôle anti-doublon."
        icon={FileSpreadsheet}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-300">Fichier CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={event => handleFile(event.target.files?.[0])}
              className="file-input file-input-bordered w-full bg-slate-950"
            />
          </label>

          <label className="min-w-56">
            <span className="mb-1 block text-sm text-slate-300">Format mémorisé</span>
            <select
              className="select select-bordered w-full bg-slate-950"
              value={selectedFormatId}
              onChange={event => applySavedFormat(event.target.value)}
            >
              <option value="">Nouveau format</option>
              {(importModel.formats.data || []).map(format => (
                <option key={format.id} value={format.id}>{format.name}</option>
              ))}
            </select>
          </label>
        </div>

        {fileName && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <FileSpreadsheet className="h-4 w-4" />
            {fileName} · {parsed.rows.length} ligne(s) · séparateur {parsed.delimiter === '\t' ? 'tabulation' : `« ${parsed.delimiter} »`}
          </div>
        )}

        {duplicateFileBatch && (
          <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Ce fichier semble avoir déjà été importé.</p>
                <p className="mt-1 text-xs text-amber-300/80">
                  Import précédent : {duplicateFileBatch.file_name || 'CSV'} le {new Date(duplicateFileBatch.created_at).toLocaleString('fr-FR')}.
                  Tu peux continuer à l’analyser, mais l’import final restera bloqué tant que tu ne confirmes pas volontairement un réimport.
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-warning checkbox-xs"
                    checked={allowDuplicateFile}
                    onChange={event => setAllowDuplicateFile(event.target.checked)}
                  />
                  Réimporter quand même ce fichier exact
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {parsed.headers.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold">Associer les colonnes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Associe les colonnes de ton export bancaire. Si ton fichier ne contient qu’une seule date, utilise-la comme <strong className="text-slate-300">Date bancaire / validation</strong> : Neyguichen l’utilisera aussi comme date d’opération.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <a href="/exemple-import-bancaire.csv" download className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-cyan-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/5">
              <Download className="h-3.5 w-3.5" />
              Télécharger un fichier exemple
            </a>
            <span className="text-slate-600">Le format peut ensuite être mémorisé pour les prochains imports.</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColumnSelect label="Date bancaire / validation" required headers={parsed.headers} value={mapping.date} onChange={value => setMapping(current => ({ ...current, date: value }))} />
            <ColumnSelect label="Date d’opération" headers={parsed.headers} value={mapping.operationDate || ''} onChange={value => setMapping(current => ({ ...current, operationDate: value }))} />
            <ColumnSelect label="Libellé" required headers={parsed.headers} value={mapping.label} onChange={value => setMapping(current => ({ ...current, label: value }))} />
            <ColumnSelect label="Montant (+ / −)" headers={parsed.headers} value={mapping.amount || ''} onChange={value => setMapping(current => ({ ...current, amount: value, debit: value ? '' : current.debit, credit: value ? '' : current.credit }))} />
            <ColumnSelect label="Débit" headers={parsed.headers} value={mapping.debit || ''} onChange={value => setMapping(current => ({ ...current, debit: value, amount: value ? '' : current.amount }))} />
            <ColumnSelect label="Crédit" headers={parsed.headers} value={mapping.credit || ''} onChange={value => setMapping(current => ({ ...current, credit: value, amount: value ? '' : current.amount }))} />
            <ColumnSelect label="Catégorie" headers={parsed.headers} value={mapping.category || ''} onChange={value => setMapping(current => ({ ...current, category: value }))} />
            <ColumnSelect label="Sous-catégorie" headers={parsed.headers} value={mapping.subcategory || ''} onChange={value => setMapping(current => ({ ...current, subcategory: value }))} />
            <ColumnSelect label="Nature" headers={parsed.headers} value={mapping.nature || ''} onChange={value => setMapping(current => ({ ...current, nature: value }))} />
            <ColumnSelect label="Note / information complémentaire" headers={parsed.headers} value={mapping.note || ''} onChange={value => setMapping(current => ({ ...current, note: value }))} />
            <ColumnSelect label="Type de revenu" headers={parsed.headers} value={mapping.incomeType || ''} onChange={value => setMapping(current => ({ ...current, incomeType: value }))} />
            <ColumnSelect label="Enveloppe d’épargne" headers={parsed.headers} value={mapping.envelope || ''} onChange={value => setMapping(current => ({ ...current, envelope: value }))} />
          </div>

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3 text-[11px] leading-5 text-slate-500">
            <span className="font-medium text-slate-300">Montant (+ / −)</span> correspond à une colonne unique contenant les débits en négatif et les crédits en positif. Si ta banque fournit deux colonnes séparées, laisse ce champ vide et associe simplement <span className="text-slate-300">Débit</span> et <span className="text-slate-300">Crédit</span>.
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-slate-400">Nommer ce format pour le réutiliser</span>
              <input
                className="input input-bordered w-full bg-slate-950"
                placeholder="Ex. Export banque principale"
                value={formatName}
                onChange={event => setFormatName(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={saveCurrentFormat}
              disabled={!formatName.trim() || !mapping.date || !mapping.label || (!mapping.amount && !mapping.debit && !mapping.credit) || importModel.saveFormat.isPending}
              className="btn btn-outline"
            >
              <Save className="h-4 w-4" />
              Mémoriser
            </button>
            <button
              type="button"
              onClick={buildPreview}
              disabled={!mapping.date || !mapping.label || (!mapping.amount && !mapping.debit && !mapping.credit) || importModel.analyze.isPending}
              className="btn btn-primary"
            >
              <Upload className="h-4 w-4" />
              {importModel.analyze.isPending ? 'Analyse…' : 'Prévisualiser'}
            </button>
          </div>
        </section>
      )}

      {(preview.length > 0 || invalidRows.length > 0) && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold">Prévisualisation obligatoire</h2>
              <p className="mt-1 text-xs text-slate-500">
                {preview.length} ligne(s) exploitable(s), {invalidRows.length} ligne(s) invalide(s)
                {previewPeriod ? ` · période du ${formatDate(previewPeriod.start)} au ${formatDate(previewPeriod.end)}` : ''}.
              </p>
            </div>
            <label className="min-w-56">
              <span className="mb-1 block text-xs text-slate-400">Catégorie par défaut des nouvelles dépenses</span>
              <select className="select select-bordered select-sm w-full bg-slate-950" value={defaultCategory} onChange={event => applyDefaultCategory(event.target.value)}>
                <option value="">À choisir ligne par ligne</option>
                {activeParentCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Stat label="À créer" value={preview.filter(row => row.decision === 'create').length} />
            <Stat label="À rapprocher" value={preview.filter(row => row.decision === 'match').length} />
            <Stat label="À ignorer" value={preview.filter(row => row.decision === 'ignore').length} />
            <Stat label="Doublons détectés" value={preview.filter(row => row.status === 'duplicate' || row.status === 'duplicate_in_file').length} />
          </div>

          {invalidRows.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Certaines lignes ne pourront pas être importées.</div>
              <p className="mt-1 text-amber-300/70">
                Premières erreurs : {invalidRows.slice(0, 5).map(item => `ligne ${item.rowIndex + 2} : ${item.reason}`).join(' · ')}
              </p>
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
            <table className="table table-sm min-w-[1040px]">
              <thead>
                <tr>
                  <th>Date opération</th>
                  <th>Date validation</th>
                  <th>Libellé</th>
                  <th className="text-right">Montant</th>
                  <th>Nature</th>
                  <th>Affectation</th>
                  <th>Analyse</th>
                  <th>Décision</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map(row => (
                  <tr key={row.rowIndex}>
                    <td>{formatDate(row.operationDate || row.date)}</td>
                    <td>{formatDate(row.date)}</td>
                    <td className="max-w-72 truncate" title={row.label}>{row.label}</td>
                    <td className={`text-right font-medium ${row.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.amount >= 0 ? '+' : ''}{formatEuro(row.amount)}
                    </td>
                    <td>
                      <select
                        className="select select-bordered select-xs bg-slate-950"
                        value={row.nature}
                        onChange={event => updateRow(row.rowIndex, { nature: event.target.value as ImportNature })}
                      >
                        {Object.entries(natureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td>
                      {row.nature === 'expense' && row.decision === 'create' ? (
                        <select
                          className="select select-bordered select-xs min-w-40 bg-slate-950"
                          value={row.categoryId || ''}
                          onChange={event => updateRow(row.rowIndex, { categoryId: event.target.value || null })}
                        >
                          <option value="">Catégorie…</option>
                          {activeParentCategories.map(category => (
                            <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>
                          ))}
                        </select>
                      ) : (row.nature === 'savings_deposit' || row.nature === 'savings_withdrawal') && row.decision === 'create' ? (
                        <select
                          className="select select-bordered select-xs min-w-40 bg-slate-950"
                          value={row.envelopeId || ''}
                          onChange={event => updateRow(row.rowIndex, { envelopeId: event.target.value || null })}
                        >
                          <option value="">Enveloppe…</option>
                          {envelopes.filter(envelope => !envelope.archived).map(envelope => (
                            <option key={envelope.id} value={envelope.id}>{envelope.nom}</option>
                          ))}
                        </select>
                      ) : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td>
                      {row.status === 'duplicate' ? (
                        <span className="badge badge-sm border-blue-800 bg-blue-950 text-blue-300">Déjà présent</span>
                      ) : row.status === 'duplicate_in_file' ? (
                        <div>
                          <span className="badge badge-sm border-violet-800 bg-violet-950 text-violet-300">Doublon dans le CSV</span>
                          <p className="mt-1 max-w-72 text-[10px] text-slate-500">
                            Même nature, date, montant et libellé que la ligne {(row.duplicateOfRowIndex ?? 0) + 2}.
                          </p>
                        </div>
                      ) : row.status === 'fixed_candidate' ? (
                        <div>
                          <span className="badge badge-sm border-amber-800 bg-amber-950 text-amber-300">Rapprocher</span>
                          <p className="mt-1 max-w-72 text-[10px] text-slate-500">{row.match?.label}</p>
                        </div>
                      ) : row.nature === 'savings_internal' ? (
                        <span className="text-xs text-slate-500">Neutre pour le solde du Budget</span>
                      ) : row.nature === 'ignore' ? (
                        <span className="text-xs text-slate-600">Ignorée</span>
                      ) : (
                        <span className="badge badge-sm border-emerald-800 bg-emerald-950 text-emerald-300">Nouvelle</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="select select-bordered select-xs min-w-44 bg-slate-950"
                        value={row.decision}
                        onChange={event => updateRow(row.rowIndex, { decision: event.target.value as ImportDecision })}
                      >
                        <option value="create">Créer une opération</option>
                        {row.match && <option value="match">Rapprocher / conserver l’existante</option>}
                        <option value="ignore">Ignorer cette ligne</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.length > 200 && <p className="mt-2 text-xs text-slate-500">Les 200 premières lignes sont affichées, mais les {preview.length} lignes seront traitées.</p>}

          <div className="mt-4 rounded-lg border border-blue-900/60 bg-blue-950/20 p-3 text-xs text-blue-200">
            Les correspondances détectées ne sont jamais appliquées silencieusement : la colonne <strong>Décision</strong> reste modifiable pour chaque ligne avant confirmation.
          </div>

          {importModel.importRows.isError && (
            <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
              {(importModel.importRows.error as Error)?.message || 'L’import n’a pas pu être finalisé.'}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs">
              {duplicateFileBlocked ? (
                <span className="text-amber-300">Réimport identique à confirmer avant validation.</span>
              ) : missingAssignmentCount > 0 ? (
                <span className="text-amber-300">
                  {missingCategoryCount > 0 ? `${missingCategoryCount} dépense(s) sans catégorie. ` : ''}
                  {missingEnvelopeCount > 0 ? `${missingEnvelopeCount} mouvement(s) d’épargne sans enveloppe.` : ''}
                </span>
              ) : (
                <span className="text-emerald-400">Prévisualisation prête à être confirmée.</span>
              )}
            </div>
            <button
              type="button"
              onClick={confirmImport}
              disabled={duplicateFileBlocked || missingAssignmentCount > 0 || importModel.importRows.isPending}
              className="btn btn-primary w-full sm:w-auto"
            >
              {importModel.importRows.isPending ? 'Import en cours…' : 'Confirmer l’import'}
            </button>
          </div>
        </section>
      )}

      {lastResult && (
        <section className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            Import terminé
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {lastResult.createdCount} créée(s) · {lastResult.matchedCount} rapprochée(s) · {lastResult.ignoredCount} ignorée(s) · {lastResult.errorCount} erreur(s).
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Historique des imports</h2>
        <p className="mt-1 text-xs text-slate-500">
          Un lot peut être annulé uniquement de manière sûre : Neyguichen supprime les opérations créées par ce lot et restaure les charges fixes qu&apos;il avait rapprochées.
        </p>

        {importModel.undoBatch.isError && (
          <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
            L’annulation a été refusée car le lot n’est plus strictement réversible. Une opération créée ou rapprochée par cet import a probablement été modifiée ensuite.
          </div>
        )}

        <div className="mt-4 space-y-2">
          {(importModel.history.data || []).length === 0 ? (
            <p className="text-sm text-slate-600">Aucun import pour ce Budget.</p>
          ) : (importModel.history.data || []).map(batch => (
            <div key={batch.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{batch.file_name || 'Import CSV'}</p>
                  <span className={`badge badge-sm ${batch.status === 'cancelled' ? 'badge-ghost' : 'badge-outline'}`}>
                    {batch.status === 'cancelled' ? 'Annulé' : 'Importé'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(batch.created_at).toLocaleString('fr-FR')} · {batch.created_count} créée(s) · {batch.matched_count} rapprochée(s) · {batch.ignored_count} ignorée(s)
                </p>
              </div>
              {batch.status === 'imported' && (
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary flex-1 sm:flex-none"
                    onClick={() => loadReview(batch.id)}
                    disabled={importModel.loadBatchItems.isPending}
                  >
                    <Eye className="h-4 w-4" />
                    Vérifier les opérations
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline flex-1 sm:flex-none"
                    disabled={importModel.undoBatch.isPending}
                    onClick={() => {
                      if (window.confirm('Annuler ce lot ? Les opérations créées par cet import seront supprimées et les rapprochements réversibles restaurés.')) {
                        importModel.undoBatch.mutate(batch.id)
                      }
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Annuler
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

      </section>

      {reviewBatchId && (
        <section className="rounded-xl border border-indigo-500/20 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Opérations importées à vérifier</h2>
              <p className="mt-1 text-xs text-slate-500">
                {reviewRows.length} ligne(s) dans ce lot. Les modifications sont appliquées directement aux opérations comptables existantes.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReviewBatchId(null); setReviewRows([]); setSelectedReviewIds([]) }}>
              Fermer
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-2 pb-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={reviewRows.length > 0 && selectedReviewIds.length === reviewRows.filter(row => row.action === 'created').length}
                  onChange={event => setSelectedReviewIds(event.target.checked ? reviewRows.filter(row => row.action === 'created').map(row => row.id) : [])}
                />
                Tout sélectionner
              </label>

              <label className="min-w-44">
                <span className="mb-1 block text-[10px] text-slate-500">Nature en lot</span>
                <select className="select select-bordered select-sm w-full bg-slate-950" value={bulkNature} onChange={e => setBulkNature(e.target.value as ImportNature | '')}>
                  <option value="">Ne pas modifier</option>
                  <option value="expense">Dépense</option>
                  <option value="income">Revenu</option>
                  <option value="savings_deposit">Versement épargne</option>
                  <option value="savings_withdrawal">Reprise épargne</option>
                </select>
              </label>

              <label className="min-w-44">
                <span className="mb-1 block text-[10px] text-slate-500">Catégorie en lot</span>
                <select className="select select-bordered select-sm w-full bg-slate-950" value={bulkCategory} onChange={e => { setBulkCategory(e.target.value); setBulkSubcategory('') }}>
                  <option value="">Ne pas modifier</option>
                  {activeParentCategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                </select>
              </label>

              <label className="min-w-44">
                <span className="mb-1 block text-[10px] text-slate-500">Sous-catégorie en lot</span>
                <select className="select select-bordered select-sm w-full bg-slate-950" value={bulkSubcategory} onChange={e => setBulkSubcategory(e.target.value)} disabled={!bulkCategory}>
                  <option value="">Aucune / ne pas modifier</option>
                  {reviewSubcategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                </select>
              </label>

              <label className="min-w-44">
                <span className="mb-1 block text-[10px] text-slate-500">Enveloppe en lot</span>
                <select className="select select-bordered select-sm w-full bg-slate-950" value={bulkEnvelope} onChange={e => setBulkEnvelope(e.target.value)}>
                  <option value="">Ne pas modifier</option>
                  {envelopes.filter(envelope => !envelope.archived).map(envelope => <option key={envelope.id} value={envelope.id}>{envelope.nom}</option>)}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={selectedReviewIds.length === 0 || importModel.updateImportedTarget.isPending || importModel.reclassifyImportedItem.isPending}
                onClick={applyBulkReview}
              >
                Appliquer à {selectedReviewIds.length || 0} opération(s)
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {reviewRows.map(row => {
              const target = row.target
              const isCreated = row.action === 'created'
              const isExpense = row.target_table === 'transactions'
              const isIncome = row.target_table === 'revenus'
              const isSavings = row.target_table === 'mouvements_epargne'
              const parentId = target?.categorie_id || ''
              const subcategories = categories.filter(category => category.parent_id === parentId && category.actif !== false)
              const envelopeId = target?.enveloppe_dest_id || target?.enveloppe_source_id || ''
              const label = target?.infos || target?.nom || target?.note || row.raw?.label || 'Opération'
              const amount = Number(target?.montant ?? target?.montant_reel ?? row.raw?.amount ?? 0)
              const operationDate = target?.date ?? target?.date_prevue ?? row.raw?.operationDate ?? row.raw?.date ?? ''
              const validationDate = target?.date_validation ?? target?.date_reelle ?? row.raw?.date ?? ''
              return (
                <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        disabled={!isCreated}
                        checked={selectedReviewIds.includes(row.id)}
                        onChange={event => setSelectedReviewIds(current => event.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))}
                      />
                    </div>

                    <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
                      <label className="xl:col-span-2">
                        <span className="mb-1 block text-[10px] text-slate-600">Libellé / note</span>
                        <input
                          className="input input-bordered input-sm w-full bg-slate-950"
                          defaultValue={label}
                          disabled={!target}
                          onBlur={e => {
                            if (!target || e.target.value === label) return
                            const patch = isExpense ? { infos: e.target.value } : isIncome ? { nom: e.target.value } : isSavings ? { note: e.target.value } : {}
                            updateReviewTarget(row, patch)
                          }}
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-[10px] text-slate-600">Montant</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input input-bordered input-sm w-full bg-slate-950"
                          defaultValue={amount}
                          disabled={!target}
                          onBlur={e => {
                            const value = Number(e.target.value)
                            if (!Number.isFinite(value) || value === amount) return
                            updateReviewTarget(row, isExpense || isIncome || isSavings ? { montant: Math.abs(value) } : { montant_reel: Math.abs(value) })
                          }}
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-[10px] text-slate-600">Date opération</span>
                        <input
                          type="date"
                          className="input input-bordered input-sm w-full bg-slate-950"
                          defaultValue={operationDate || ''}
                          disabled={!target || isSavings}
                          onBlur={e => {
                            if (!target || !e.target.value || e.target.value === operationDate) return
                            updateReviewTarget(row, isExpense ? { date: e.target.value } : isIncome ? { date_prevue: e.target.value } : {})
                          }}
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-[10px] text-slate-600">Date validation</span>
                        <input
                          type="date"
                          className="input input-bordered input-sm w-full bg-slate-950"
                          defaultValue={validationDate || ''}
                          disabled={!target}
                          onBlur={e => {
                            if (!target || !e.target.value || e.target.value === validationDate) return
                            updateReviewTarget(row, isExpense ? { date_validation: e.target.value } : isIncome ? { date_reelle: e.target.value } : isSavings ? { date: e.target.value } : { date_reelle: e.target.value })
                          }}
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-[10px] text-slate-600">Nature</span>
                        <select
                          className="select select-bordered select-sm w-full bg-slate-950"
                          value={row.nature}
                          disabled={!isCreated}
                          onChange={e => reclassifyReviewRow(row, e.target.value as ImportNature)}
                        >
                          <option value="expense">Dépense</option>
                          <option value="income">Revenu</option>
                          <option value="savings_deposit">Versement épargne</option>
                          <option value="savings_withdrawal">Reprise épargne</option>
                          <option value="savings_internal" disabled>Transfert interne</option>
                          <option value="ignore" disabled>Ignorer</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 pl-0 lg:pl-7">
                    {isExpense && (
                      <>
                        <select
                          className="select select-bordered select-xs min-w-48 bg-slate-950"
                          value={parentId}
                          onChange={e => updateReviewTarget(row, { categorie_id: e.target.value, sous_categorie_id: null })}
                        >
                          <option value="">Catégorie…</option>
                          {activeParentCategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                        </select>
                        <select
                          className="select select-bordered select-xs min-w-48 bg-slate-950"
                          value={target?.sous_categorie_id || ''}
                          disabled={!parentId}
                          onChange={e => updateReviewTarget(row, { sous_categorie_id: e.target.value || null })}
                        >
                          <option value="">Sans sous-catégorie</option>
                          {subcategories.map(category => <option key={category.id} value={category.id}>{category.icone || '•'} {category.nom}</option>)}
                        </select>
                      </>
                    )}

                    {isIncome && (
                      <select
                        className="select select-bordered select-xs min-w-40 bg-slate-950"
                        value={target?.type || 'actif'}
                        onChange={e => updateReviewTarget(row, { type: e.target.value })}
                      >
                        <option value="actif">Revenu actif</option>
                        <option value="passif">Revenu passif</option>
                      </select>
                    )}

                    {isSavings && (
                      <select
                        className="select select-bordered select-xs min-w-48 bg-slate-950"
                        value={envelopeId}
                        onChange={e => updateReviewTarget(row, row.nature === 'savings_deposit'
                          ? { enveloppe_source_id: null, enveloppe_dest_id: e.target.value }
                          : { enveloppe_source_id: e.target.value, enveloppe_dest_id: null })}
                      >
                        <option value="">Enveloppe…</option>
                        {envelopes.filter(envelope => !envelope.archived).map(envelope => <option key={envelope.id} value={envelope.id}>{envelope.nom}</option>)}
                      </select>
                    )}

                    <span className="badge badge-sm badge-outline">
                      {row.action === 'created' ? 'Créée par import' : row.action === 'matched' ? 'Rapprochée' : row.action === 'ignored' ? 'Ignorée' : 'Erreur'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function ColumnSelect({ label, required, headers, value, onChange }: {
  label: string
  required?: boolean
  headers: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-slate-400">{label}{required ? ' *' : ''}</span>
      <select className="select select-bordered select-sm w-full bg-slate-950" value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Non utilisée</option>
        {headers.map(header => <option key={header} value={header}>{header}</option>)}
      </select>
    </label>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
