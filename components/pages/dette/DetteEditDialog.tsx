'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, FileText, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'
import type { Dette } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dette: Dette | null
  minimumMontant?: number
  onSave: (data: {
    id: string
    titre: string
    personne: string
    montant: number
    date_echeance: string | null
    description: string | null
  }) => Promise<void>
}

export default function DetteEditDialog({ open, onOpenChange, dette, minimumMontant = 0, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateFin, setDateFin] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dette) return
    setTitre(dette.titre)
    setPersonne(dette.personne)
    setMontant(Number(dette.montant))
    setDateFin(dette.date_echeance || '')
    setNote(dette.description || '')
    setError(null)
  }, [dette])

  const montantValide = Number.isFinite(montant) && montant > 0 && montant + 0.005 >= minimumMontant
  const canSave = Boolean(dette && titre.trim() && personne.trim() && montantValide)
  const isDebt = dette?.type === 'je_dois'

  const handleSave = async () => {
    if (!dette || !canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        id: dette.id,
        titre: titre.trim(),
        personne: personne.trim(),
        montant,
        date_echeance: dateFin || null,
        description: note.trim() || null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la modification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (saving) return
      if (!nextOpen) setError(null)
      onOpenChange(nextOpen)
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isDebt ? 'Modifier la dette' : 'Modifier la créance'}</DialogTitle>
          <DialogDescription>Les remboursements déjà enregistrés restent inchangés.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Informations" icon={<FileText className="h-4 w-4" />}>
            <FormField label="Titre">
              <Input value={titre} onChange={e => setTitre(e.target.value)} />
            </FormField>
            <FormField label={isDebt ? 'Créancier' : 'Débiteur'}>
              <Input value={personne} onChange={e => setPersonne(e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Montant" icon={<HandCoins className="h-4 w-4" />}>
            <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant total" />
            {minimumMontant > 0 && (
              <p className="text-xs leading-5 text-slate-500">
                Minimum autorisé : {minimumMontant.toFixed(2)} € correspondant aux remboursements déjà enregistrés.
              </p>
            )}
          </FormSection>

          <FormSection title="Échéance et note" icon={<CalendarDays className="h-4 w-4" />}>
            <FormField label="Échéance" hint="Facultatif">
              <Input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
            </FormField>
            <FormField label="Note" hint="Facultatif">
              <Input placeholder="Ajouter une précision" value={note} onChange={e => setNote(e.target.value)} />
            </FormField>
          </FormSection>

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
