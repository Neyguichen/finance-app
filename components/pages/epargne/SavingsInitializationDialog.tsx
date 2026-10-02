'use client'

import { useEffect, useState } from 'react'
import { Landmark, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'
import { localDateISO } from '@/lib/utils'

type Envelope = {
  id: string
  nom: string
  solde: number
  solde_reference?: number | null
  date_solde_reference?: string | null
}

export default function SavingsInitializationDialog({
  open,
  onOpenChange,
  envelopes,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  envelopes: Envelope[]
  onSave: (date: string, balances: Array<{ id: string; balance: number }>) => Promise<void>
}) {
  const [date, setDate] = useState(localDateISO())
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const initial: Record<string, number> = {}
    for (const env of envelopes) {
      initial[env.id] = Number(env.solde_reference ?? env.solde ?? 0)
    }
    setBalances(initial)
    const existingDates = envelopes.map(env => env.date_solde_reference).filter(Boolean) as string[]
    setDate(existingDates[0] || localDateISO())
  }, [open, envelopes])

  const submit = async () => {
    if (!date || saving) return
    setSaving(true)
    try {
      await onSave(date, envelopes.map(env => ({ id: env.id, balance: Number(balances[env.id] || 0) })))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value) }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Initialiser mon épargne</DialogTitle>
          <DialogDescription>
            Renseignez le solde réellement détenu dans chaque enveloppe à une date donnée. Ces montants servent de point de départ sans créer de faux mouvements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Date de référence" icon={<Landmark className="h-4 w-4" />}>
            <FormField label="Soldes constatés au">
              <Input type="date" value={date} onChange={event => setDate(event.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Soldes des enveloppes" description="Vous pourrez modifier cette référence plus tard si nécessaire." icon={<Save className="h-4 w-4" />}>
            {envelopes.length === 0 ? (
              <p className="text-sm text-slate-500">Créez d’abord au moins une enveloppe d’épargne.</p>
            ) : envelopes.map(env => (
              <div key={env.id} className="grid items-center gap-2 sm:grid-cols-[1fr_180px]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{env.nom}</p>
                  <p className="text-[11px] text-slate-600">Solde réellement disponible</p>
                </div>
                <CalculatorInput
                  value={balances[env.id] ?? 0}
                  onChange={value => setBalances(current => ({ ...current, [env.id]: value }))}
                  placeholder="0,00 €"
                />
              </div>
            ))}
          </FormSection>
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={!date || envelopes.length === 0 || saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les soldes'}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
