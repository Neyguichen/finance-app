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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>
            {tab === 'je_dois' ? 'Nouvelle dette (je dois)' : 'Nouveau prêt (j\'ai prêté)'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Titre (ex: Prêt voiture)" value={titre} onChange={e => setTitre(e.target.value)} />
          <Input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} />
          <Input placeholder={tab === 'je_dois' ? 'À qui je dois ?' : 'À qui j\'ai prêté ?'} value={personne} onChange={e => setPersonne(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Montant total" value={montant} onChange={e => setMontant(e.target.value)} />
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Date de remboursement souhaitée (optionnel)</label>
            <Input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit}>Ajouter</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}