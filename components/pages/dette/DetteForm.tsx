'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [montant, setMontant] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const montantNumber = Number(montant)
  const canSubmit = Boolean(
    titre.trim() &&
    personne.trim() &&
    Number.isFinite(montantNumber) &&
    montantNumber > 0,
  )

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        titre: titre.trim(),
        description: description.trim() || null,
        personne: personne.trim(),
        montant: montantNumber,
        date_echeance: dateEcheance || null,
      })
      setTitre('')
      setDescription('')
      setPersonne('')
      setMontant('')
      setDateEcheance('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette dette ou créance.')
    } finally {
      setSaving(false)
    }
  }

  const isDebt = tab === 'je_dois'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!saving) {
        setError(null)
        onOpenChange(nextOpen)
      }
    }}>
      <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>
            {isDebt ? 'Nouvelle dette — Je dois' : 'Nouvelle créance — On me doit'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={isDebt ? 'Titre (ex : Prêt voiture)' : 'Titre (ex : Avance à un proche)'} value={titre} onChange={e => setTitre(e.target.value)} />
          <Input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} />
          <Input placeholder={isDebt ? 'À qui je dois ?' : 'Qui me doit ?'} value={personne} onChange={e => setPersonne(e.target.value)} />
          <Input type="number" min="0.01" step="0.01" placeholder="Montant total" value={montant} onChange={e => setMontant(e.target.value)} />
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              {isDebt ? 'Date de remboursement souhaitée (optionnel)' : 'Date de remboursement attendue (optionnel)'}
            </label>
            <Input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" disabled={!canSubmit || saving} onClick={handleSubmit}>
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
