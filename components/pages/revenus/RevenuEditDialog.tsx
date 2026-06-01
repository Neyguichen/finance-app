'use client'

import { useState, useEffect } from 'react'
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
}

type Props = {
  editTarget: EditTarget | null
  onClose: () => void
  onSave: (data: { id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null }, scope: 'mois' | 'tous') => Promise<void>
}

export default function RevenuEditDialog({ editTarget, onClose, onSave }: Props) {
  const [editNom, setEditNom] = useState('')
  const [editMontant, setEditMontant] = useState(0)
  const [editType, setEditType] = useState<'actif' | 'passif'>('actif')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pendingData, setPendingData] = useState<any>(null)

  // Auto-fill quand editTarget change
  useEffect(() => {
    if (editTarget) {
      setEditNom(editTarget.nom)
      setEditMontant(Number(editTarget.montant))
      setEditType(editTarget.type)
    }
  }, [editTarget])

  const handleSaveClick = () => {
    if (!editTarget) return
    const data = {
      id: editTarget.id,
      nom: editNom,
      montant: editMontant,
      type: editType,
      recurrentId: editTarget.recurrentId,
    }
    if (editTarget.recurrentId) {
      // Sauvegarder les données AVANT d'ouvrir le scope dialog
      // (car onClose() va nullifier editTarget quand le dialog d'édition se ferme)
      setPendingData(data)
      setScopeOpen(true)
    } else {
      onSave(data, 'mois')
      onClose()
    }
  }

  const handleScopeChoice = async (scope: 'mois' | 'tous') => {
    if (!pendingData) return
    await onSave(pendingData, scope)
    setPendingData(null)
    setScopeOpen(false)
    onClose()
  }

  return (
    <>
      {/* Dialog édition */}
      <Dialog open={!!editTarget && !scopeOpen} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle>Modifier le revenu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
            <CalculatorInput value={editMontant} onChange={setEditMontant} placeholder="Montant" />
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Type</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditType('actif')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editType === 'actif' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>Actif</button>
                <button type="button" onClick={() => setEditType('passif')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editType === 'passif' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>Passif</button>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveClick}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog scope */}
      <Dialog open={scopeOpen} onOpenChange={v => { if (!v) { setScopeOpen(false); onClose() } }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle>Appliquer la modification à…</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Button className="w-full" variant="outline" onClick={() => handleScopeChoice('mois')}>
              Ce mois seulement
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleScopeChoice('tous')}>
              Tous les prochains mois
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setScopeOpen(false); onClose() }}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}