'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, ReceiptText, Scissors, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import CategorieDialog from './CategorieDialog'
import { formatEuro, localDateISO } from '@/lib/utils'

type Props = {
  editTx: any
  onClose: () => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  subcategoriesEnabled?: boolean
  onSave: (data: { id: string; montant: number; date: string; date_validation: string | null; infos: string | null; categorie_id: string; sous_categorie_id: string | null }) => Promise<void>
  onRemb?: (tx: any) => void
  onSplit?: (tx: any) => void
  onUnsplit?: (tx: any) => void
}

export default function DepenseEditDialog({
  editTx,
  onClose,
  categories,
  espaceId,
  createCat,
  doubleDate,
  subcategoriesEnabled = true,
  onSave,
  onRemb,
  onSplit,
  onUnsplit,
}: Props) {
  const [montant, setMontant] = useState(0)
  const [infos, setInfos] = useState('')
  const [date, setDate] = useState('')
  const [dateValidation, setDateValidation] = useState('')
  const [validated, setValidated] = useState(false)
  const [catId, setCatId] = useState('')
  const [subCatId, setSubCatId] = useState('')
  const [categoryDialogParentId, setCategoryDialogParentId] = useState<string | null | undefined>(undefined)

  const parentCategories = useMemo(
    () => categories.filter((c: any) => !c.parent_id && c.actif !== false).sort((a: any, b: any) => a.nom.localeCompare(b.nom)),
    [categories],
  )
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false).sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = catId ? getSubCats(catId) : []
  const isSplit = editTx?.is_split && editTx?.children?.length > 0
  const isSplitChild = !!editTx?.parent_transaction_id
  const reimbursements = editTx?.remboursements || []
  const reimbursementTotal = reimbursements.reduce((sum: number, item: any) => sum + Number(item.montant), 0)
  const grossAmount = Number(editTx?.montant || 0)
  const netAmount = Math.max(0, grossAmount - reimbursementTotal)

  useEffect(() => {
    if (!editTx) return
    setMontant(Number(editTx.montant))
    setInfos(editTx.infos || '')
    setDate(editTx.date)
    setDateValidation(editTx.date_validation || '')
    setValidated(Boolean(editTx.date_validation))
    setCatId(editTx.categorie_id || '')
    setSubCatId(editTx.sous_categorie_id || '')
    setCategoryDialogParentId(undefined)
  }, [editTx])

  const handleClose = () => {
    onClose()
    setCategoryDialogParentId(undefined)
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

  const saveDates = async () => {
    await onSave({
      id: editTx.id,
      montant: Number(editTx.montant),
      date,
      date_validation: doubleDate ? (dateValidation || null) : (validated ? (dateValidation || localDateISO()) : null),
      infos: editTx.infos || null,
      categorie_id: editTx.categorie_id,
      sous_categorie_id: editTx.sous_categorie_id || null,
    })
    onClose()
  }

  return (
    <>
      <Dialog open={!!editTx} onOpenChange={value => { if (!value) handleClose() }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{isSplit ? 'Dépense répartie' : 'Modifier la dépense'}</DialogTitle>
            {isSplit && <DialogDescription>La dépense reste un seul flux bancaire, réparti analytiquement sur plusieurs catégories.</DialogDescription>}
          </DialogHeader>

          {isSplit ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.07] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Dépense initiale" value={formatEuro(grossAmount)} />
                  <Metric label="Remboursé" value={formatEuro(reimbursementTotal)} tone="text-emerald-300" />
                  <Metric label="Coût net réparti" value={formatEuro(netAmount)} tone="text-indigo-200" />
                </div>
                {editTx.infos && <p className="mt-3 text-xs text-slate-500">{editTx.infos}</p>}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30">
                <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400">Répartition du coût net</div>
                <div className="divide-y divide-slate-800/70">
                  {editTx.children.map((child: any) => (
                    <div key={child.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="text-lg">{child.categorie?.icone || '📦'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">{child.categorie?.nom || 'Sans catégorie'}</p>
                        {child.sous_categorie?.nom && <p className="truncate text-[10px] text-slate-500">{child.sous_categorie.icone} {child.sous_categorie.nom}</p>}
                        {child.infos && <p className="truncate text-[10px] text-slate-600">{child.infos}</p>}
                      </div>
                      <strong className="text-sm text-indigo-200">{formatEuro(Number(child.montant))}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <p className="text-sm font-semibold text-slate-200">Date et validation</p>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{doubleDate ? "Date d'opération" : 'Date'}</label>
                  <Input type="date" value={date} onChange={event => setDate(event.target.value)} />
                </div>
                {!doubleDate ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" className="checkbox checkbox-sm" checked={validated} onChange={event => {
                      const checked = event.target.checked
                      setValidated(checked)
                      setDateValidation(checked ? (dateValidation || localDateISO()) : '')
                    }} />
                    Dépense validée
                  </label>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Date de validation bancaire <span className="text-slate-700">(optionnel)</span></label>
                    <Input type="date" value={dateValidation} onChange={event => setDateValidation(event.target.value)} />
                  </div>
                )}
                <Button className="w-full" onClick={saveDates}>Enregistrer les dates</Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {onRemb && (
                  <Button variant="outline" className="border-emerald-800 text-emerald-300" onClick={() => { handleClose(); onRemb(editTx) }}>
                    <ReceiptText className="mr-2 h-4 w-4" />Ajouter un remboursement
                  </Button>
                )}
                {onSplit && (
                  <Button variant="outline" className="border-indigo-800 text-indigo-300" onClick={() => { handleClose(); onSplit(editTx) }}>
                    <Scissors className="mr-2 h-4 w-4" />Modifier la répartition
                  </Button>
                )}
              </div>

              {onUnsplit && (
                <Button variant="outline" className="w-full border-amber-800 text-amber-300" onClick={() => { onUnsplit(editTx); handleClose() }}>
                  <X className="mr-2 h-4 w-4" />Supprimer la répartition
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={handleClose}>Fermer</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {!isSplitChild ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{doubleDate ? "Date d'opération" : 'Date'}</label>
                    <Input type="date" value={date} onChange={event => setDate(event.target.value)} />
                  </div>
                  {doubleDate && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Date de validation bancaire <span className="text-slate-700">(optionnel)</span></label>
                      <Input type="date" value={dateValidation} onChange={event => setDateValidation(event.target.value)} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-xs text-slate-500">
                  La date et la validation bancaire sont gérées par la dépense répartie principale.
                </p>
              )}

              {!doubleDate && !isSplitChild && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={validated} onChange={event => {
                    const checked = event.target.checked
                    setValidated(checked)
                    setDateValidation(checked ? (dateValidation || localDateISO()) : '')
                  }} />
                  Dépense validée
                </label>
              )}

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Catégorie</label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <SearchableSelect
                      value={catId}
                      placeholder="Sélectionner une catégorie"
                      options={[
                        { value: '', label: 'Sans catégorie', icon: '—' },
                        ...parentCategories.map((category: any) => ({ value: category.id, label: category.nom, icon: category.icone })),
                      ]}
                      onChange={value => { setCatId(value); setSubCatId('') }}
                    />
                    <Button type="button" variant="outline" className="h-11 px-3" onClick={() => setCategoryDialogParentId(null)}>
                      <Plus className="mr-1.5 h-4 w-4" />Nouvelle catégorie
                    </Button>
                  </div>
                </div>

                {subcategoriesEnabled && catId && (
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">Sous-catégorie <span className="text-slate-700">(optionnel)</span></label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <SearchableSelect
                        value={subCatId}
                        placeholder="Aucune sous-catégorie"
                        options={[
                          { value: '', label: 'Aucune sous-catégorie', icon: '—' },
                          ...subCats.map((sub: any) => ({ value: sub.id, label: sub.nom, icon: sub.icone })),
                        ]}
                        onChange={setSubCatId}
                      />
                      <Button type="button" variant="outline" className="h-11 px-3" onClick={() => setCategoryDialogParentId(catId)}>
                        <Plus className="mr-1.5 h-4 w-4" />Nouvelle sous-catégorie
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />
              <Input placeholder="Informations" value={infos} onChange={event => setInfos(event.target.value)} />

              <Button className="w-full" disabled={!catId || montant <= 0} onClick={async () => {
                if (!editTx) return
                await onSave({
                  id: editTx.id,
                  montant,
                  date,
                  date_validation: doubleDate ? (dateValidation || null) : (validated ? (dateValidation || localDateISO()) : null),
                  infos: infos || null,
                  categorie_id: catId,
                  sous_categorie_id: subCatId || null,
                })
                onClose()
              }}>Enregistrer</Button>

              <div className="grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2">
                {onRemb && (
                  <Button variant="outline" className="border-emerald-800 text-emerald-300" onClick={() => { handleClose(); onRemb(editTx) }}>
                    <ReceiptText className="mr-2 h-4 w-4" />Remboursement
                  </Button>
                )}
                {onSplit && !isSplitChild && (
                  <Button variant="outline" className="border-indigo-800 text-indigo-300" onClick={() => { handleClose(); onSplit(editTx) }}>
                    <Scissors className="mr-2 h-4 w-4" />Répartir
                  </Button>
                )}
              </div>
              <Button className="w-full" variant="ghost" onClick={handleClose}>Annuler</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CategorieDialog
        open={categoryDialogParentId !== undefined}
        onOpenChange={value => { if (!value) setCategoryDialogParentId(undefined) }}
        categories={categories}
        initialParentId={categoryDialogParentId || null}
        lockParent={categoryDialogParentId !== null}
        onCreate={createCategory}
        onCreated={created => {
          if (!created?.id) return
          if (categoryDialogParentId) setSubCatId(created.id)
          else {
            setCatId(created.id)
            setSubCatId('')
          }
          setCategoryDialogParentId(undefined)
        }}
      />
    </>
  )
}

function Metric({ label, value, tone = 'text-slate-100' }: { label: string; value: string; tone?: string }) {
  return <div><p className="text-[10px] text-slate-600">{label}</p><p className={'mt-1 text-sm font-semibold ' + tone}>{value}</p></div>
}
