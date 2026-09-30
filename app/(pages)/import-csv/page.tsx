'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, RotateCcw, Save, Upload } from 'lucide-react'
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
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: envelopes = [] } = useEnveloppes(espace?.id)
  const importModel = useCsvImport(espace?.id, userId)

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
    const nextMapping: CsvMapping = {
      date: guessColumn(result.headers, ['date', 'operation', 'compta', 'valeur']),
      label: guessColumn(result.headers, ['libelle', 'description', 'intitule', 'label', 'memo']),
      amount: guessColumn(result.headers, ['montant', 'amount', 'somme']),
      debit: guessColumn(result.headers, ['debit']),
      credit: guessColumn(result.headers, ['credit']),
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
    const analyzed = await importModel.analyze.mutateAsync(result.valid)
    setPreview(analyzed.map(row => ({
      ...row,
      categoryId: row.nature === 'expense' && defaultCategory ? defaultCategory : row.categoryId,
    })))
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 pb-24">
      <header>
        <p className="text-xs uppercase tracking-wide text-blue-400">Phase 8 · Import CSV</p>
        <h1 className="mt-1 text-2xl font-bold">Importer un relevé bancaire</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Le CSV sert à rapprocher Neyguichen de la réalité bancaire. Rien n&apos;est importé avant la prévisualisation et ta confirmation.
          Les doublons probables restent visibles.
        </p>
      </header>

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
            Neyguichen ne cherche pas à reconnaître ta banque. Tu choisis simplement quelles colonnes correspondent aux données nécessaires.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ColumnSelect label="Date" required headers={parsed.headers} value={mapping.date} onChange={value => setMapping(current => ({ ...current, date: value }))} />
            <ColumnSelect label="Libellé" required headers={parsed.headers} value={mapping.label} onChange={value => setMapping(current => ({ ...current, label: value }))} />
            <ColumnSelect label="Montant signé" headers={parsed.headers} value={mapping.amount || ''} onChange={value => setMapping(current => ({ ...current, amount: value, debit: value ? '' : current.debit, credit: value ? '' : current.credit }))} />
            <ColumnSelect label="Débit" headers={parsed.headers} value={mapping.debit || ''} onChange={value => setMapping(current => ({ ...current, debit: value, amount: value ? '' : current.amount }))} />
            <ColumnSelect label="Crédit" headers={parsed.headers} value={mapping.credit || ''} onChange={value => setMapping(current => ({ ...current, credit: value, amount: value ? '' : current.amount }))} />
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
            <table className="table table-sm min-w-[900px]">
              <thead>
                <tr>
                  <th>Date</th>
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
              className="btn btn-primary"
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
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={importModel.undoBatch.isPending}
                  onClick={() => {
                    if (window.confirm('Annuler ce lot ? Les opérations créées par cet import seront supprimées et les rapprochements réversibles restaurés.')) {
                      importModel.undoBatch.mutate(batch.id)
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Annuler le lot
                </button>
              )}
            </div>
          ))}
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
