'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'

type EditProps = {
  editMvt: { id: string; montant: number; note: string | null; recurrentId: string | null; date: string } | null
  onClose: () => void
  onSave: (id: string, montant: number, note: string | null, recurrentId: string | null, date: string) => void
}

export function MouvementEditDialog({ editMvt, onClose, onSave }: EditProps) {
  const [montant, setMontant] = useState(0)
  const [note, setNote] = useState('')
  const [jourPrevu, setJourPrevu] = useState(1)
  const [date, setDate] = useState('')

  useEffect(() => {
    if (editMvt) {
      setMontant(Number(editMvt.montant))
      setNote(editMvt.note || '')
      setDate(String(editMvt.date).slice(0, 10))
    }
  }, [editMvt])

  return (
    <Dialog open={!!editMvt} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le mouvement</DialogTitle>
          <DialogDescription>Ajustez la date, le montant ou la note de ce mouvement d’épargne.</DialogDescription>
        </DialogHeader>
        <FormSection title="Mouvement" icon={<ArrowLeftRight className="h-4 w-4" />}>
          <FormField label="Date du mouvement">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
          <FormField label="Montant">
            <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
          </FormField>
          <FormField label="Note" hint="Facultatif">
            <Input placeholder="Ajouter une précision" value={note} onChange={e => setNote(e.target.value)} />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button disabled={montant <= 0 || !date} onClick={() => onSave(editMvt!.id, montant, note || null, editMvt!.recurrentId, date)}>Enregistrer</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}

type ScopeProps = {
  target: { id: string; montant: number; note: string | null; recurrentId: string } | null
  onClose: () => void
  onSave: (scope: 'mois' | 'tous') => void
}

export function MouvementScopeDialog({ target, onClose, onSave }: ScopeProps) {
  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier ce mouvement récurrent</DialogTitle>
          <DialogDescription>Choisissez si la modification concerne seulement ce mois ou la récurrence à venir.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button type="button" onClick={() => onSave('mois')} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 text-left hover:border-slate-700">
            <span className="block text-sm font-semibold text-slate-100">Ce mois seulement</span>
            <span className="mt-1 block text-xs text-slate-500">Les prochains mouvements restent inchangés.</span>
          </button>
          <button type="button" onClick={() => onSave('tous')} className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left hover:bg-indigo-500/15">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-200"><Repeat2 className="h-4 w-4" /> Ce mois et les prochains</span>
            <span className="mt-1 block text-xs text-slate-500">La récurrence est mise à jour pour la suite.</span>
          </button>
        </div>
        <FormActions><Button variant="ghost" onClick={onClose}>Annuler</Button></FormActions>
      </DialogContent>
    </Dialog>
  )
}

type DeleteProps = {
  target: { id: string; recurrentId: string | null; note: string | null } | null
  onClose: () => void
  onDelete: (mode: 'mois' | 'definitif') => void
}

export function MouvementDeleteDialog({ target, onClose, onDelete }: DeleteProps) {
  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer ce mouvement ?</DialogTitle>
          <DialogDescription>Choisissez la portée de la suppression.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button type="button" onClick={() => onDelete('mois')} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 text-left hover:border-slate-700">
            <span className="block text-sm font-semibold text-slate-100">Ce mois seulement</span>
            <span className="mt-1 block text-xs text-slate-500">La récurrence continuera les mois suivants.</span>
          </button>
          {target?.recurrentId && (
            <button type="button" onClick={() => onDelete('definitif')} className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left hover:bg-rose-500/15">
              <span className="block text-sm font-semibold text-rose-300">Arrêter définitivement</span>
              <span className="mt-1 block text-xs text-slate-500">Ce mouvement ne sera plus reporté.</span>
            </button>
          )}
        </div>
        <FormActions><Button variant="ghost" onClick={onClose}>Annuler</Button></FormActions>
      </DialogContent>
    </Dialog>
  )
}


type RecurrenceEditProps = {
  target: { id: string; montant: number; frequence_mois: number; jour_prevu?: number | null; note?: string | null } | null
  onClose: () => void
  onSave: (data: { id: string; montant: number; frequence_mois: number; jour_prevu: number; note: string | null }) => void
}

export function EpargneRecurrenceEditDialog({ target, onClose, onSave }: RecurrenceEditProps) {
  const [montant, setMontant] = useState(0)
  const [frequence, setFrequence] = useState(1)
  const [note, setNote] = useState('')
  const [jourPrevu, setJourPrevu] = useState(1)

  useEffect(() => {
    if (!target) return
    setMontant(Number(target.montant))
    setFrequence(Number(target.frequence_mois || 1))
    setNote(target.note || '')
    setJourPrevu(Number(target.jour_prevu || 1))
  }, [target])

  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la récurrence</DialogTitle>
          <DialogDescription>
            Les mois déjà passés restent inchangés. La modification s’appliquera au mois courant et aux mois suivants.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormSection title="Récurrence" icon={<Repeat2 className="h-4 w-4" />}>
            <FormField label="Montant">
              <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
            </FormField>
            <FormField label="Fréquence">
              <select
                value={frequence}
                onChange={e => setFrequence(Number(e.target.value))}
                className="select select-bordered w-full"
              >
                <option value={1}>Tous les mois</option>
                <option value={2}>Tous les 2 mois</option>
                <option value={3}>Tous les 3 mois</option>
                <option value={6}>Tous les 6 mois</option>
                <option value={12}>Tous les ans</option>
              </select>
            </FormField>
            <FormField label="Jour prévu" hint="1 par défaut">
              <Input type="number" min={1} max={31} value={jourPrevu} onChange={e => setJourPrevu(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} />
            </FormField>
            <FormField label="Note" hint="Facultatif">
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. Épargne vacances" />
            </FormField>
          </FormSection>
        </div>
        <FormActions>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            disabled={montant <= 0}
            onClick={() => target && onSave({ id:target.id, montant, frequence_mois:frequence, jour_prevu:jourPrevu, note:note || null })}
          >
            Appliquer aux prochains mois
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
