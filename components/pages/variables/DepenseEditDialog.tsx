'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Scissors, ReceiptText, X } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import InlineCatCreator from './InlineCatCreator'

type Props = {
  editTx: any
  onClose: () => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  onSave: (data: { id: string; montant: number; date: string; date_validation: string | null; infos: string | null; categorie_id: string; sous_categorie_id: string | null }) => Promise<void>
  onRemb?: (tx: any) => void
  onSplit?: (tx: any) => void
  onUnsplit?: (tx: any) => void
}

export default function DepenseEditDialog({ editTx, onClose, categories, espaceId, createCat, doubleDate, onSave, onRemb, onSplit, onUnsplit }: Props) {
  const [montant, setMontant] = useState(0)
  const [infos, setInfos] = useState('')
  const [date, setDate] = useState('')
  const [dateValidation, setDateValidation] = useState('')
  const [catId, setCatId] = useState('')
  const [subCatId, setSubCatId] = useState('')
  const [inlineCatOpen, setInlineCatOpen] = useState(false)

  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = catId ? getSubCats(catId) : []
  const isSplit = editTx?.is_split && editTx?.children?.length > 0

  useEffect(() => {
    if (editTx) {
      setMontant(Number(editTx.montant))
      setInfos(editTx.infos || '')
      setDate(editTx.date)
      setDateValidation(editTx.date_validation || '')
      setCatId(editTx.categorie_id)
      setSubCatId(editTx.sous_categorie_id || '')
    }
  }, [editTx])

  const handleCatChange = (value: string) => {
    if (value === '__NEW__') {
      setInlineCatOpen(true)
    } else {
      setCatId(value)
      setSubCatId('')
    }
  }

  const handleClose = () => { onClose(); setInlineCatOpen(false) }

  return (
    <Dialog open={!!editTx} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>{isSplit ? 'Dépense scindée' : 'Modifier la dépense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* === Mode splitté : résumé + actions === */}
          {isSplit ? (
            <>
              <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Montant total</span>
                  <span className="font-bold text-white">{formatEuro(Number(editTx.montant))}</span>
                </div>
                {editTx.infos && (
                  <p className="text-xs text-slate-500">{editTx.infos}</p>
                )}
                <div className="text-xs text-slate-500">
                  {editTx.categorie?.icone} {editTx.categorie?.nom} • {editTx.children.length} ligne(s)
                </div>
              </div>
              {onSplit && (
                <Button variant="outline" className="w-full text-indigo-400 border-indigo-800" onClick={() => { handleClose(); onSplit(editTx) }}>
                  <Scissors className="w-4 h-4 mr-2" /> Re-scinder
                </Button>
              )}
              {onUnsplit && (
                <Button variant="outline" className="w-full text-amber-400 border-amber-800" onClick={() => { onUnsplit(editTx); handleClose() }}>
                  <X className="w-4 h-4 mr-2" /> Annuler le split
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={handleClose}>Fermer</Button>
            </>
          ) : (
            /* === Mode normal : édition + actions === */
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {doubleDate ? "Date d'opération" : 'Date'}
                </label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              {doubleDate && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Date de validation bancaire <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <Input type="date" value={dateValidation} onChange={e => setDateValidation(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                  value={catId} onChange={e => handleCatChange(e.target.value)}>
                  <option value="">Budget...</option>
                  {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                  ))}
                  <option value="__NEW__">➕ Nouveau budget...</option>
                </select>
                {inlineCatOpen && espaceId && (
                  <InlineCatCreator
                    espaceId={espaceId}
                    categoriesCount={categories.length}
                    createCat={(data) => createCat.mutateAsync(data)}
                    onCreated={(id) => { setCatId(id); setInlineCatOpen(false) }}
                    onCancel={() => setInlineCatOpen(false)}
                  />
                )}
              </div>
              {subCats.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Sous-catégorie <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                    value={subCatId} onChange={e => setSubCatId(e.target.value)}>
                    <option value="">Aucune</option>
                    {subCats.map((sc: any) => (
                      <option key={sc.id} value={sc.id}>{sc.icone} {sc.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />
              <Input placeholder="Infos" value={infos} onChange={e => setInfos(e.target.value)} />

              <Button className="w-full" onClick={async () => {
                if (!editTx) return
                await onSave({
                  id: editTx.id,
                  montant,
                  date,
                  date_validation: doubleDate && dateValidation ? dateValidation : null,
                  infos: infos || null,
                  categorie_id: catId,
                  sous_categorie_id: subCatId || null,
                })
                onClose()
              }}>Enregistrer</Button>

              {/* --- Actions secondaires --- */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                {onRemb && (
                  <Button variant="outline" className="w-full text-emerald-400 border-emerald-800" onClick={() => { handleClose(); onRemb(editTx) }}>
                    <ReceiptText className="w-4 h-4 mr-2" /> Remboursement
                  </Button>
                )}
                {onSplit && (
                  <Button variant="outline" className="w-full text-indigo-400 border-indigo-800" onClick={() => { handleClose(); onSplit(editTx) }}>
                    <Scissors className="w-4 h-4 mr-2" /> Scinder sur plusieurs catégories
                  </Button>
                )}
              </div>

              <Button className="w-full" variant="ghost" onClick={handleClose}>Annuler</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}