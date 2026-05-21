'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// --- EDIT ---
type EditProps = {
  editMvt: { id: string; montant: number; note: string | null; recurrentId: string | null } | null
  onClose: () => void
  onSave: (id: string, montant: number, note: string | null, recurrentId: string | null) => void
}

export function MouvementEditDialog({ editMvt, onClose, onSave }: EditProps) {
  const [montant, setMontant] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (editMvt) {
      setMontant(Number(editMvt.montant))
      setNote(editMvt.note || '')
    }
  }, [editMvt])

  return (
    <Dialog open={!!editMvt} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier le mouvement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />
          <Input placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
          <Button className="w-full" onClick={() => onSave(editMvt!.id, montant, note || null, editMvt!.recurrentId)}>
            Enregistrer
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- SCOPE ---
type ScopeProps = {
  target: { id: string; montant: number; note: string | null; recurrentId: string } | null
  onClose: () => void
  onSave: (scope: 'mois' | 'tous') => void
}

export function MouvementScopeDialog({ target, onClose, onSave }: ScopeProps) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier ce mouvement récurrent</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onSave('mois')}>Ce mois seulement</Button>
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => onSave('tous')}>
            Tous les prochains mois
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- DELETE ---
type DeleteProps = {
  target: { id: string; recurrentId: string | null; note: string | null } | null
  onClose: () => void
  onDelete: (mode: 'mois' | 'definitif') => void
}

export function MouvementDeleteDialog({ target, onClose, onDelete }: DeleteProps) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Supprimer ce mouvement ?</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onDelete('mois')}>Ce mois seulement</Button>
          {target?.recurrentId && (
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => onDelete('definitif')}>
              Définitivement (ne plus reporter)
            </Button>
          )}
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}