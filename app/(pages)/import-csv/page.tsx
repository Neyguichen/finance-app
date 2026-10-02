'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, Eye, FileSpreadsheet, RotateCcw, Save, Upload } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import PageHeader from '@/components/layout/PageHeader'
import { useCategories } from '@/lib/hooks/useCategories'
import { useEnveloppes } from '@/lib/hooks/useEpargne'
import { useCsvImport, type ImportPreviewRow } from '@/lib/hooks/useCsvImport'
import {
  fingerprintCsv,
  mapCsvRows,
  parseCsv,
  type CsvMapping,
  type ParsedCsv,
} from '@/lib/import-csv'
import { formatDate, formatEuro } from '@/lib/utils'

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
  const [lastResult, setLastResult] = useState<{
    batchId: string
    pendingCount: number
    createdCount: number
    matchedCount: number
    ignoredCount: number
    errorCount: number
  } | null>(null)

  const previewPeriod = useMemo(() => {
    if (preview.length === 0) return null
    const dates = preview.map(row => row.date).sort()
    return { start: dates[0], end: dates[dates.length - 1] }
  }, [preview])

  const reviewingBatches = useMemo(
    () => (importModel.history.data || []).filter(batch => batch.status === 'reviewing'),
    [importModel.history.data]
  )
  const pendingCount = useMemo(
    () => reviewingBatches.reduce((total, batch) => total + Math.max(0, batch.row_count - batch.created_count - batch.matched_count - batch.ignored_count - batch.error_count), 0),
    [reviewingBatches]
  )

  const loadParsed = (text: string, delimiter?: string) => {
    const result = parseCsv(text, delimiter)
    setParsed(result)

    const guessedOperationDate = guessColumn(result.headers, ['date operation', 'date transaction', 'operation date'])
    const guessedValidationDate =
      guessColumn(result.headers, ['date valeur', 'date comptable', 'date validation', 'validation date']) ||
      guessColumn(result.headers, ['date'])

    setMapping({
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
    })

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
      const subcategory = row.subcategoryName && parent
        ? categories.find(category =>
            category.parent_id === parent.id &&
            normalize(category.nom) === normalize(row.subcategoryName)
          )
        : null
      const envelope = row.envelopeName
        ? envelopes.find(item => !item.archived && normalize(item.nom) === normalize(row.envelopeName))
        : null

      return {
        ...row,
        categoryId: parent?.id || row.categoryId,
        subcategoryId: subcategory?.id || row.subcategoryId,
        envelopeId: envelope?.id || row.envelopeId,
      }
    })

    const analyzed = await importModel.analyze.mutateAsync(enriched)
    setPreview(analyzed)
    setLastResult(null)
  }

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

  const confirmImport = async () => {
    if (!fileName || preview.length === 0 || duplicateFileBlocked) return
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
        description="Enregistre ton relevé bancaire, puis classe et valide les opérations à ton rythme dans un écran dédié."
        icon={FileSpreadsheet}
      />

      {reviewingBatches.length > 0 && (
        <section className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-indigo-200">{pendingCount} transaction(s) importée(s) à valider</p>
              <p className="mt-1 text-xs text-slate-400">
                Elles peuvent provenir de plusieurs fichiers. Tu peux continuer à importer d’autres relevés puis revenir les valider à ton rythme.
              </p>
            </div>
            <Link href="/import-csv/validation" className="btn btn-primary btn-sm">
              <Eye className="h-4 w-4" />
              Reprendre la validation
            </Link>
          </div>
        </section>
      )}

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
                <p className="font-medium">Ce fichier semble avoir déjà été enregistré.</p>
                <p className="mt-1 text-xs text-amber-300/80">
                  Import précédent : {duplicateFileBatch.file_name || 'CSV'} le {new Date(duplicateFileBatch.created_at).toLocaleString('fr-FR')}.
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-warning checkbox-xs"
                    checked={allowDuplicateFile}
                    onChange={event => setAllowDuplicateFile(event.target.checked)}
                  />
                  Enregistrer quand même ce fichier exact
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {parsed.headers.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">Associer les colonnes</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-500">
                Seuls la date bancaire, le libellé et le montant sont indispensables. Les autres informations peuvent être récupérées si ton fichier les contient, ou complétées plus tard dans l’écran de validation.
              </p>
            </div>
            <Link href="/aide?article=import" className="inline-flex shrink-0 items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
              <BookOpen className="h-4 w-4" />
              Voir les colonnes possibles
            </Link>
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
            Si ton relevé ne contient qu’une seule date, associe-la à <span className="font-medium text-slate-300">Date bancaire / validation</span> : elle sera également utilisée comme date d’opération. Pour les montants, utilise soit une colonne <span className="text-slate-300">Montant (+ / −)</span>, soit les deux colonnes <span className="text-slate-300">Débit</span> et <span className="text-slate-300">Crédit</span>.
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
          <div>
            <h2 className="font-semibold">Prévisualisation du fichier</h2>
            <p className="mt-1 text-xs text-slate-500">
              {preview.length} ligne(s) exploitable(s), {invalidRows.length} ligne(s) invalide(s)
              {previewPeriod ? ` · période du ${formatDate(previewPeriod.start)} au ${formatDate(previewPeriod.end)}` : ''}.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Stat label="Lignes à enregistrer" value={preview.length} />
            <Stat label="Correspondances proposées" value={preview.filter(row => Boolean(row.match)).length} />
            <Stat label="Doublons détectés" value={preview.filter(row => row.status === 'duplicate' || row.status === 'duplicate_in_file').length} />
            <Stat label="Lignes invalides" value={invalidRows.length} />
          </div>

          {invalidRows.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Certaines lignes ne pourront pas être enregistrées.</div>
              <p className="mt-1 text-amber-300/70">
                Premières erreurs : {invalidRows.slice(0, 5).map(item => `ligne ${item.rowIndex + 2} : ${item.reason}`).join(' · ')}
              </p>
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
            <table className="table table-sm min-w-[780px]">
              <thead>
                <tr>
                  <th>Date opération</th>
                  <th>Date validation</th>
                  <th>Libellé</th>
                  <th className="text-right">Montant</th>
                  <th>Analyse</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 100).map(row => (
                  <tr key={row.rowIndex}>
                    <td>{formatDate(row.operationDate || row.date)}</td>
                    <td>{formatDate(row.date)}</td>
                    <td className="max-w-[34rem] truncate" title={row.label}>{row.label}</td>
                    <td className={`text-right font-medium ${row.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.amount >= 0 ? '+' : ''}{formatEuro(row.amount)}
                    </td>
                    <td>
                      {row.status === 'duplicate' ? (
                        <span className="badge badge-sm border-blue-800 bg-blue-950 text-blue-300">Déjà présent</span>
                      ) : row.status === 'duplicate_in_file' ? (
                        <span className="badge badge-sm border-violet-800 bg-violet-950 text-violet-300">Doublon CSV</span>
                      ) : row.status === 'fixed_candidate' ? (
                        <span className="badge badge-sm border-amber-800 bg-amber-950 text-amber-300">Rapprochement possible</span>
                      ) : (
                        <span className="badge badge-sm border-slate-700 bg-slate-900 text-slate-400">À valider</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.length > 100 && (
            <p className="mt-2 text-xs text-slate-500">
              Les 100 premières lignes sont affichées ici. Les {preview.length} lignes exploitables seront bien enregistrées.
            </p>
          )}

          <div className="mt-4 rounded-lg border border-indigo-900/60 bg-indigo-950/20 p-3 text-xs leading-5 text-indigo-200">
            Cette étape sert uniquement à vérifier que le fichier est correctement lu. <strong>Tu n’as plus besoin de classer les opérations maintenant.</strong> Après l’enregistrement, chaque ligne sera conservée dans « Transactions importées à valider » et ton avancement sera sauvegardé automatiquement.
          </div>

          {importModel.importRows.isError && (
            <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
              {(importModel.importRows.error as Error)?.message || 'L’import n’a pas pu être enregistré.'}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={duplicateFileBlocked ? 'text-xs text-amber-300' : 'text-xs text-emerald-400'}>
              {duplicateFileBlocked ? 'Réimport identique à confirmer avant enregistrement.' : 'Le fichier peut être enregistré et classé plus tard.'}
            </span>
            <button
              type="button"
              onClick={confirmImport}
              disabled={duplicateFileBlocked || preview.length === 0 || importModel.importRows.isPending}
              className="btn btn-primary w-full sm:w-auto"
            >
              {importModel.importRows.isPending ? 'Enregistrement…' : `Enregistrer les ${preview.length} opérations`}
            </button>
          </div>
        </section>
      )}

      {lastResult && (
        <section className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 font-semibold text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            Import enregistré
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {lastResult.pendingCount} opération(s) sont maintenant sauvegardées et peuvent être validées immédiatement ou plus tard.
          </p>
          <Link href="/import-csv/validation" className="btn btn-primary btn-sm mt-3">
            <Eye className="h-4 w-4" />
            Valider les opérations
          </Link>
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Historique des imports</h2>
        <p className="mt-1 text-xs text-slate-500">
          Les imports en cours peuvent être repris à tout moment. Un lot terminé conserve le lien vers les opérations réellement créées ou rapprochées.
        </p>

        {importModel.undoBatch.isError && (
          <div className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
            L’annulation a été refusée car au moins une opération déjà validée a été modifiée après l’import.
          </div>
        )}

        <div className="mt-4 space-y-2">
          {(importModel.history.data || []).length === 0 ? (
            <p className="text-sm text-slate-600">Aucun import pour ce Budget.</p>
          ) : (importModel.history.data || []).map(batch => {
            const pending = Math.max(0, batch.row_count - batch.created_count - batch.matched_count - batch.ignored_count - batch.error_count)
            return (
              <div key={batch.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{batch.file_name || 'Import CSV'}</p>
                    <span className={`badge badge-sm ${batch.status === 'reviewing' ? 'border-amber-700 bg-amber-950 text-amber-300' : batch.status === 'completed' ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : 'badge-ghost'}`}>
                      {batch.status === 'reviewing' ? 'À valider' : batch.status === 'completed' ? 'Validé' : 'Annulé'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(batch.created_at).toLocaleString('fr-FR')} · {pending} à valider · {batch.created_count} créée(s) · {batch.matched_count} rapprochée(s) · {batch.ignored_count} ignorée(s)
                  </p>
                </div>

                {batch.status !== 'cancelled' && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Link href={batch.status === 'reviewing' ? '/import-csv/validation' : `/import-csv/validation?batch=${batch.id}`} className="btn btn-sm btn-primary flex-1 sm:flex-none">
                      <Eye className="h-4 w-4" />
                      {batch.status === 'reviewing' ? 'Valider' : 'Voir'}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline flex-1 sm:flex-none"
                      disabled={importModel.undoBatch.isPending}
                      onClick={() => {
                        if (window.confirm('Annuler ce lot ? Les opérations déjà créées par cet import seront supprimées uniquement si cela peut être fait sans écraser de modifications plus récentes.')) {
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
            )
          })}
        </div>
      </section>
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
