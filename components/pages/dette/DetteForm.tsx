'use client'

import { useState } from 'react'
import { CalendarDays, FileText, HandCoins, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: 'je_dois' | 'jai_prete'
  onSubmit: (data: {
    titre: string
    description: string | null
    personne: string
    montant: number
    date_echeance: string | null
  }) => Promise<void>
}

export default function DetteForm({ open, onOpenChange, tab, onSubmit }: Props) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateEcheance, setDateEcheance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDebt = tab === 'je_dois'
  const canSubmit = Boolean(titre.trim() && personne.trim() && Number.isFinite(montant) && montant > 0)

  const resetForm = () => {
    setTitre('')
    setDescription('')
    setPersonne('')
    setMontant(0)
    setDateEcheance('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        titre: titre.trim(),
        description: description.trim() || null,
        personne: personne.trim(),
        montant,
        date_echeance: dateEcheance || null,
      })
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette dette ou créance.')
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
          <DialogTitle>{isDebt ? 'Nouvelle dette' : 'Nouvelle créance'}</DialogTitle>
          <DialogDescription>
            {isDebt ? 'Enregistrez une somme que vous devez à quelqu’un.' : 'Enregistrez une somme que quelqu’un doit vous rembourser.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Informations" description="Identifiez facilement cette dette ou créance." icon={<FileText className="h-4 w-4" />}>
            <FormField label="Titre">
              <Input placeholder={isDebt ? 'Ex. Prêt voiture' : 'Ex. Avance à un proche'} value={titre} onChange={e => setTitre(e.target.value)} />
            </FormField>
            <FormField label={isDebt ? 'À qui devez-vous cette somme ?' : 'Qui vous doit cette somme ?'}>
              <Input placeholder="Nom de la personne ou de l’organisme" value={personne} onChange={e => setPersonne(e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Montant" description="Montant total à rembourser." icon={<HandCoins className="h-4 w-4" />}>
            <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
          </FormSection>

          <FormSection title="Échéance et note" description="Ces informations sont facultatives." icon={<CalendarDays className="h-4 w-4" />}>
            <FormField label={isDebt ? 'Remboursement souhaité le' : 'Remboursement attendu le'} hint="Facultatif">
              <Input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
            </FormField>
            <FormField label="Note" hint="Facultatif">
              <Input placeholder="Ajouter un contexte ou une précision" value={description} onChange={e => setDescription(e.target.value)} />
            </FormField>
          </FormSection>

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Enregistrement…' : isDebt ? 'Créer la dette' : 'Créer la créance'}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
