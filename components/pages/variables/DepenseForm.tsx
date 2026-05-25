'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import InlineCatCreator from './InlineCatCreator'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  onSubmit: (data: { categorie_id: string; sous_categorie_id: string | null; montant: number; date: string; date_validation: string | null; infos: string | null }) => Promise<void>
}

export default function DepenseForm({ open, onOpenChange, categories, espaceId, createCat, doubleDate, onSubmit }: Props) {
  const [txCat, setTxCat] = useState('')
  const [txSubCat, setTxSubCat] = useState('')
  const [txMontant, setTxMontant] = useState(0)
  const [txInfos, setTxInfos] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txDateValidation, setTxDateValidation] = useState('')
  const [inlineCatOpen, setInlineCatOpen] = useState(false)

  // Séparer parents et enfants
  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = txCat ? getSubCats(txCat) : []

  const handleCatChange = (value: string) => {
    if (value === '__NEW__') {
      setInlineCatOpen(true)
    } else {
      setTxCat(value)
      setTxSubCat('') // Reset sous-catégorie quand on change de catégorie
    }
  }

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) setInlineCatOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              {doubleDate ? "Date d'opération" : 'Date'}
            </label>
            <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
          </div>
          {doubleDate && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Date de validation bancaire <span className="text-slate-600">(optionnel)</span>
              </label>
              <Input type="date" value={txDateValidation} onChange={e => setTxDateValidation(e.target.value)} />
            </div>
          )}
          {/* Sélecteur catégorie (parents uniquement) */}
          <div className="space-y-2">
            <select className="select select-bordered w-full bg-slate-800 border-slate-700"
              value={txCat} onChange={e => handleCatChange(e.target.value)}>
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
                onCreated={(id) => { setTxCat(id); setInlineCatOpen(false) }}
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
                value={txSubCat} onChange={e => setTxSubCat(e.target.value)}>
                <option value="">Aucune</option>
                {subCats.map((sc: any) => (
                  <option key={sc.id} value={sc.id}>{sc.icone} {sc.nom}</option>
                ))}
              </select>
            </div>
          )}
          <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="Montant" />
          <Input placeholder="Infos (optionnel)" value={txInfos} onChange={e => setTxInfos(e.target.value)} />
          <Button className="w-full" onClick={async () => {
            if (!txCat) return
            await onSubmit({
              categorie_id: txCat,
              sous_categorie_id: txSubCat || null,
              montant: txMontant,
              date: txDate,
              date_validation: doubleDate && txDateValidation ? txDateValidation : null,
              infos: txInfos || null,
            })
            setTxMontant(0)
            setTxInfos('')
            setTxSubCat('')
            setTxDateValidation('')
            onOpenChange(false)
          }}>Ajouter</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}