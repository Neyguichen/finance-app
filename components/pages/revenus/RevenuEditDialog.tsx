'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type EditTarget = {
  id: string
  nom: string
  montant: number
  type: 'actif' | 'passif'
  recurrentId?: string | null
  datePrevue?: string | null
}

type EditScope = 'mois' | 'future'

type Props = {
  editTarget: EditTarget | null
  onClose: () => void
  onSave: (data: { id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null; datePrevue?: string | null }, scope: EditScope) => Promise<void>
}

export default function RevenuEditDialog({ editTarget, onClose, onSave }: Props) {
  const [editNom, setEditNom] = useState('')
  const [editMontant, setEditMontant] = useState(0)
  const [editType, setEditType] = useState<'actif' | 'passif'>('actif')
  const [editDatePrevue, setEditDatePrevue] = useState('')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pendingData, setPendingData] = useState<any>(null)

  useEffect(() => {
    if (!editTarget) return
    setEditNom(editTarget.nom)
    setEditMontant(Number(editTarget.montant))
    setEditType(editTarget.type)
    setEditDatePrevue(editTarget.datePrevue || '')
  }, [editTarget])

  const handleSaveClick = () => {
    if (!editTarget) return
    const data = {
      id: editTarget.id,
      nom: editNom,
      montant: editMontant,
      type: editType,
      recurrentId: editTarget.recurrentId,
      datePrevue: editDatePrevue || null,
    }

    if (editTarget.recurrentId) {
      setPendingData(data)
      setScopeOpen(true)
      return
    }

    void onSave(data, 'mois').then(onClose)
  }

  const handleScopeChoice = async (scope: EditScope) => {
    if (!pendingData) return
    await onSave(pendingData, scope)
    setPendingData(null)
    setScopeOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog open={!!editTarget && !scopeOpen} onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent className="border-slate-700 bg-slate-900">
          <DialogHeader><DialogTitle>Modifier le revenu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editNom} onChange={event => setEditNom(event.target.value)} />
            <CalculatorInput value={editMontant} onChange={setEditMontant} placeholder="Montant" />
            <div>
              <label className="mb-1 block text-sm text-slate-400">Date prévue <span className="text-xs">(facultative)</span></label>
              <Input type="date" value={editDatePrevue} onChange={event => setEditDatePrevue(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Type</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
                <button type="button" onClick={() => setEditType('actif')} className={'rounded-lg px-3 py-2 text-sm font-medium transition ' + (editType === 'actif' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300')}>Actif</button>
                <button type="button" onClick={() => setEditType('passif')} className={'rounded-lg px-3 py-2 text-sm font-medium transition ' + (editType === 'passif' ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-300')}>Passif</button>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveClick}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scopeOpen} onOpenChange={open => { if (!open) { setScopeOpen(false); onClose() } }}>
        <DialogContent className="border-slate-700 bg-slate-900">
          <DialogHeader><DialogTitle>Appliquer la modification à…</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">Choisissez si cette modification concerne uniquement l’occurrence sélectionnée ou également toutes celles qui suivent.</p>
          <div className="space-y-3">
            <Button className="w-full" variant="outline" onClick={() => handleScopeChoice('mois')}>Cette occurrence uniquement</Button>
            <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleScopeChoice('future')}>Cette occurrence et les suivantes</Button>
            <Button className="w-full" variant="ghost" onClick={() => { setScopeOpen(false); onClose() }}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
