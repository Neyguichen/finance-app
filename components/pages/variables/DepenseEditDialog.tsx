'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import InlineCatCreator from './InlineCatCreator'

type Props = {
  editTx: any
  onClose: () => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  onSave: (data: { id: string; montant: number; date: string; date_validation: string | null; infos: string | null; categorie_id: string; sous_categorie_id: string | null }) => Promise<void>
}

export default function DepenseEditDialog({ editTx, onClose, categories, espaceId, createCat, doubleDate, onSave }: Props) {
  const [montant, setMontant] = useState(0)
  const [infos, setInfos] = useState('')
  const [date, setDate] = useState('')
  const [dateValidation, setDateValidation] = useState('')
  const [catId, setCatId] = useState('')
  const [subCatId, setSubCatId] = useState('')
  const [inlineCatOpen, setInlineCatOpen] = useState(false)

  // Séparer parents et enfants
  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = catId ? getSubCats(catId) : []

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
      setSubCatId('') // Reset sous-catégorie quand on change de catégorie
    }
  }

  const handleClose = () => { onClose(); setInlineCatOpen(false) }

  return (
    <Dialog open={!!editTx} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier la dépense</DialogTitle></DialogHeader>
        <div className="space-y-4">
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
          {/* Sélecteur catégorie (parents uniquement) */}
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
          {/* Sélecteur sous-catégorie (si la catégorie en a) */}
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
          <Button className="w-full" variant="ghost" onClick={handleClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}