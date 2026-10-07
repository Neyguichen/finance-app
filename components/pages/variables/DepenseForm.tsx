'use client'

import { useState } from 'react'
import { Plus, Scissors, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import CategorieDialog from './CategorieDialog'
import { formatEuro, localDateISO } from '@/lib/utils'

type SplitLine = {
  categorie_id: string
  sous_categorie_id: string
  montant: number
  infos: string
}

type CategoryTarget =
  | { scope: 'main'; parentId: string | null }
  | { scope: 'split'; lineIndex: number; parentId: string | null }
  | null

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  subcategoriesEnabled?: boolean
  splitEnabled?: boolean
  onSubmit: (data: { categorie_id: string; sous_categorie_id: string | null; montant: number; date: string; date_validation: string | null; infos: string | null }) => Promise<void>
  onSubmitSplit?: (data: { categorie_id: string; montant: number; date: string; date_validation: string | null; infos: string | null }, lines: SplitLine[]) => Promise<void>
}

export default function DepenseForm({
  open,
  onOpenChange,
  categories,
  espaceId,
  createCat,
  doubleDate,
  subcategoriesEnabled = true,
  splitEnabled = true,
  onSubmit,
  onSubmitSplit,
}: Props) {
  const [txCat, setTxCat] = useState('')
  const [txSubCat, setTxSubCat] = useState('')
  const [txMontant, setTxMontant] = useState(0)
  const [txInfos, setTxInfos] = useState('')
  const [txDate, setTxDate] = useState(localDateISO())
  const [txDateValidation, setTxDateValidation] = useState('')
  const [txValidated, setTxValidated] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [categoryTarget, setCategoryTarget] = useState<CategoryTarget>(null)
  const [splitLines, setSplitLines] = useState<SplitLine[]>([
    { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
    { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
  ])

  const parentCategories = categories
    .filter((c: any) => !c.parent_id && c.actif !== false)
    .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
  const getSubCats = (parentId: string) =>
    categories
      .filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = txCat ? getSubCats(txCat) : []
  const parentOptions = [
    { value: '', label: 'Sélectionner une catégorie', icon: '—' },
    ...parentCategories.map((c: any) => ({ value: c.id, label: c.nom, icon: c.icone })),
  ]

  const sumSplitLines = splitLines.reduce((sum, line) => sum + line.montant, 0)
  const splitRemaining = Math.round((txMontant - sumSplitLines) * 100) / 100
  const splitValid = splitLines.length >= 2 && Math.abs(splitRemaining) < 0.01 && splitLines.every(line => line.categorie_id && line.montant > 0)

  const updateSplitLine = (index: number, field: keyof SplitLine, value: any) => {
    setSplitLines(prev => prev.map((line, lineIndex) => {
      if (lineIndex !== index) return line
      const updated = { ...line, [field]: value }
      if (field === 'categorie_id') updated.sous_categorie_id = ''
      return updated
    }))
  }

  const resetForm = () => {
    setTxCat('')
    setTxSubCat('')
    setTxMontant(0)
    setTxInfos('')
    setTxDate(localDateISO())
    setTxDateValidation('')
    setTxValidated(false)
    setSplitMode(false)
    setCategoryTarget(null)
    setSplitLines([
      { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
      { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
    ])
  }

  const handleClose = (value: boolean) => {
    onOpenChange(value)
    if (!value) resetForm()
  }

  const createCategory = async (data: { nom: string; icone: string; parent_id?: string }) => {
    if (!createCat || !espaceId) return null
    const parent = data.parent_id ? categories.find((category: any) => category.id === data.parent_id) : null
    return createCat.mutateAsync({
      espace_id: espaceId,
      nom: data.nom,
      icone: data.icone,
      couleur: parent?.couleur || '#6366f1',
      ordre: categories.length,
      parent_id: data.parent_id || null,
      actif: true,
    })
  }

  const applyCreatedCategory = (created: any) => {
    if (!created?.id || !categoryTarget) return
    if (categoryTarget.scope === 'main') {
      if (categoryTarget.parentId) setTxSubCat(created.id)
      else {
        setTxCat(created.id)
        setTxSubCat('')
      }
      return
    }
    if (categoryTarget.parentId) updateSplitLine(categoryTarget.lineIndex, 'sous_categorie_id', created.id)
    else updateSplitLine(categoryTarget.lineIndex, 'categorie_id', created.id)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[170px_150px_1fr] sm:items-end">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Date de transaction</label>
                <Input type="date" value={txDate} onChange={event => setTxDate(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Montant</label>
                <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="0,00 €" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Description <span className="text-slate-600">(optionnel)</span></label>
                <Input placeholder="Ex. Hyper U" value={txInfos} onChange={event => setTxInfos(event.target.value)} />
              </div>
            </div>

            {!splitMode && (
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">Catégorie</label>
                    <div className="grid grid-cols-[1fr_40px] gap-2">
                      <SearchableSelect
                        value={txCat}
                        options={parentOptions}
                        onChange={value => { setTxCat(value); setTxSubCat('') }}
                        placeholder="Sélectionner une catégorie"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-10 p-0"
                        aria-label="Créer une catégorie"
                        onClick={() => setCategoryTarget({ scope: 'main', parentId: null })}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {subcategoriesEnabled && (
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-500">Sous-catégorie <span className="text-slate-700">(optionnel)</span></label>
                      <div className="grid grid-cols-[1fr_40px] gap-2">
                        <SearchableSelect
                          value={txSubCat}
                          options={[
                            { value: '', label: 'Aucune sous-catégorie', icon: '—' },
                            ...subCats.map((sub: any) => ({ value: sub.id, label: sub.nom, icon: sub.icone })),
                          ]}
                          onChange={setTxSubCat}
                          placeholder={txCat ? 'Aucune sous-catégorie' : 'Choisir une catégorie'}
                          disabled={!txCat}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-10 p-0"
                          aria-label="Créer une sous-catégorie"
                          disabled={!txCat}
                          onClick={() => txCat && setCategoryTarget({ scope: 'main', parentId: txCat })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {splitEnabled && (
              <button
                type="button"
                onClick={() => setSplitMode(value => !value)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${splitMode ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-950/30 text-slate-500 hover:text-slate-300'}`}
              >
                <Scissors className="h-3.5 w-3.5" />
                {splitMode ? 'Répartition sur plusieurs catégories activée' : 'Répartir sur plusieurs catégories'}
              </button>
            )}

            {splitEnabled && splitMode && (
              <div className="space-y-2.5">
                {splitLines.map((line, index) => {
                  const lineSubs = line.categorie_id ? getSubCats(line.categorie_id) : []
                  return (
                    <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Répartition {index + 1}</span>
                        {splitLines.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400" onClick={() => setSplitLines(prev => prev.filter((_, i) => i !== index))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_130px]">
                        <div className="grid grid-cols-[1fr_40px] gap-2">
                          <SearchableSelect
                            value={line.categorie_id}
                            options={parentOptions}
                            onChange={value => updateSplitLine(index, 'categorie_id', value)}
                            placeholder="Catégorie"
                          />
                          <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setCategoryTarget({ scope: 'split', lineIndex: index, parentId: null })} aria-label="Créer une catégorie">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-[1fr_40px] gap-2">
                          <SearchableSelect
                            value={line.sous_categorie_id}
                            options={[
                              { value: '', label: 'Aucune sous-catégorie', icon: '—' },
                              ...lineSubs.map((sub: any) => ({ value: sub.id, label: sub.nom, icon: sub.icone })),
                            ]}
                            onChange={value => updateSplitLine(index, 'sous_categorie_id', value)}
                            placeholder="Sous-catégorie"
                            disabled={!line.categorie_id || !subcategoriesEnabled}
                          />
                          <Button type="button" variant="outline" className="h-10 w-10 p-0" disabled={!line.categorie_id || !subcategoriesEnabled} onClick={() => line.categorie_id && setCategoryTarget({ scope: 'split', lineIndex: index, parentId: line.categorie_id })} aria-label="Créer une sous-catégorie">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <CalculatorInput value={line.montant} onChange={value => updateSplitLine(index, 'montant', value)} placeholder="Montant" />
                      </div>

                      <Input className="mt-2" placeholder="Description de cette répartition (optionnel)" value={line.infos} onChange={event => updateSplitLine(index, 'infos', event.target.value)} />
                    </div>
                  )
                })}

                <div className="grid gap-2 sm:grid-cols-[1fr_210px]">
                  <Button variant="outline" size="sm" onClick={() => setSplitLines(prev => [...prev, { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Ajouter une répartition
                  </Button>
                  <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${Math.abs(splitRemaining) < 0.01 ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-amber-500/25 bg-amber-500/10'}`}>
                    <span className="text-slate-500">Reste à répartir</span>
                    <span className={`font-bold ${Math.abs(splitRemaining) < 0.01 ? 'text-emerald-300' : 'text-amber-300'}`}>{formatEuro(splitRemaining)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
              {doubleDate ? (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Date de validation <span className="text-slate-600">(laisser vide si non validée)</span></label>
                  <Input type="date" value={txDateValidation} onChange={event => setTxDateValidation(event.target.value)} />
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={txValidated}
                    onChange={event => {
                      const checked = event.target.checked
                      setTxValidated(checked)
                      setTxDateValidation(checked ? localDateISO() : '')
                    }}
                  />
                  Dépense validée
                </label>
              )}
            </div>

            {!splitMode ? (
              <Button
                className="w-full"
                disabled={!txCat || txMontant <= 0}
                onClick={async () => {
                  if (!txCat || txMontant <= 0) return
                  await onSubmit({
                    categorie_id: txCat,
                    sous_categorie_id: txSubCat || null,
                    montant: txMontant,
                    date: txDate,
                    date_validation: doubleDate ? (txDateValidation || null) : (txValidated ? localDateISO() : null),
                    infos: txInfos || null,
                  })
                  resetForm()
                  onOpenChange(false)
                }}
              >
                Ajouter la dépense
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={!splitValid || txMontant <= 0}
                onClick={async () => {
                  if (!onSubmitSplit || !splitValid) return
                  await onSubmitSplit(
                    {
                      categorie_id: splitLines[0].categorie_id,
                      montant: txMontant,
                      date: txDate,
                      date_validation: doubleDate ? (txDateValidation || null) : (txValidated ? localDateISO() : null),
                      infos: txInfos || null,
                    },
                    splitLines.map(line => ({ ...line, sous_categorie_id: line.sous_categorie_id || null, infos: line.infos || null })) as any,
                  )
                  resetForm()
                  onOpenChange(false)
                }}
              >
                Créer la dépense répartie
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CategorieDialog
        open={categoryTarget !== null}
        onOpenChange={value => { if (!value) setCategoryTarget(null) }}
        categories={categories}
        initialParentId={categoryTarget?.parentId || null}
        lockParent={categoryTarget?.parentId != null}
        onCreate={createCategory}
        onCreated={created => {
          applyCreatedCategory(created)
          setCategoryTarget(null)
        }}
      />
    </>
  )
}
