'use client'

import { useState } from 'react'
import { PiggyBank, Target, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { nom: string; objectif: number | null; solde_initial: number | null }) => Promise<void>
}

export default function EnveloppeForm({ open, onOpenChange, onSubmit }: Props) {
  const [nom, setNom] = useState('')
  const [objectif, setObjectif] = useState<number | null>(null)
  const [solde, setSolde] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setNom('')
    setObjectif(null)
    setSolde(null)
  }

  const handleSubmit = async () => {
    if (!nom.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ nom: nom.trim(), objectif, solde_initial: solde })
      resetForm()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (saving) return
      onOpenChange(nextOpen)
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle enveloppe</DialogTitle>
          <DialogDescription>Créez un objectif d’épargne et suivez sa progression dans le temps.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Enveloppe" description="Donnez-lui un nom clair et reconnaissable." icon={<PiggyBank className="h-4 w-4" />}>
            <FormField label="Nom">
              <Input placeholder="Ex. Vacances, voiture, travaux…" value={nom} onChange={e => setNom(e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Objectif" description="Définissez une cible si vous souhaitez suivre votre progression." icon={<Target className="h-4 w-4" />}>
            <FormField label="Montant cible" hint="Facultatif">
              <CalculatorInput value={objectif ?? 0} onChange={v => setObjectif(v || null)} placeholder="0,00 €" />
            </FormField>
          </FormSection>

          <FormSection title="Point de départ" description="Somme déjà disponible dans cette enveloppe au moment de sa création." icon={<WalletCards className="h-4 w-4" />}>
            <FormField label="Solde actuel" hint="Facultatif">
              <CalculatorInput value={solde ?? 0} onChange={v => setSolde(v || null)} placeholder="0,00 €" />
            </FormField>
          </FormSection>
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!nom.trim() || saving}>{saving ? 'Création…' : 'Créer l’enveloppe'}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
