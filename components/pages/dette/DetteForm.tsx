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

  const handleSubmit = async () => {
    if (!titre || !personne || !montant) return
    await onSubmit({
      titre,
      description: description || null,
      personne,
      montant: Number(montant),
      date_echeance: dateEcheance || null,
    })
    setTitre(''); setDescription(''); setPersonne(''); setMontant(''); setDateEcheance('')
  }

  const isDebt = tab === 'je_dois'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Input type="number" step="0.01" placeholder="Montant total" value={montant} onChange={e => setMontant(e.target.value)} />
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              {isDebt ? 'Date de remboursement souhaitée (optionnel)' : 'Date de remboursement attendue (optionnel)'}
            </label>
            <Input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit}>Ajouter</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
