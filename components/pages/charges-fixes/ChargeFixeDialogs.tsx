'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// --- DIALOG D'ÉDITION ---
type EditProps = {
  editTarget: { id: string; nom: string; montant: number; recurrentId: string | null } | null
  onClose: () => void
  onSave: (id: string, nom: string, montant: number, recurrentId: string | null) => void
}

export function ChargeFixeEditDialog({ editTarget, onClose, onSave }: EditProps) {
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState(0)

  useEffect(() => {
    if (editTarget) {
      setNom(editTarget.nom)
      setMontant(Number(editTarget.montant))
    }
  }, [editTarget])

  return (
    <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Modifier la charge fixe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} />
          <CalculatorInput value={montant} onChange={(val) => setMontant(val)} placeholder="Montant" />
          <Button className="w-full" onClick={() => onSave(editTarget!.id, nom, montant, editTarget!.recurrentId)}>
            Enregistrer
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- DIALOG DE SUPPRESSION ---
type DeleteProps = {
  target: { id: string; recurrentId: string | null; nom: string } | null
  onClose: () => void
  onDelete: (mode: 'mois' | 'definitif') => void
}

export function ChargeFixeDeleteDialog({ target, onClose, onDelete }: DeleteProps) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Supprimer &laquo; {target?.nom} &raquo; ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onDelete('mois')}>
            Ce mois seulement
          </Button>
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

// --- DIALOG PORTÉE D'ÉDITION ---
type ScopeProps = {
  target: { id: string; nom: string; montant: number; recurrentId: string } | null
  onClose: () => void
  onSave: (scope: 'mois' | 'tous') => void
}

export function ChargeFixeScopeDialog({ target, onClose, onSave }: ScopeProps) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Modifier « {target?.nom} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onSave('mois')}>
            Ce mois seulement
          </Button>
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => onSave('tous')}>
            Tous les prochains mois
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}