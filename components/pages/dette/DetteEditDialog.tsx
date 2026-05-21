'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Dette } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dette: Dette | null
  onSave: (data: {
    id: string
    titre: string
    personne: string
    montant: number
    date_echeance: string | null
    description: string | null
  }) => void
}

export default function DetteEditDialog({ open, onOpenChange, dette, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateFin, setDateFin] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (dette) {
      setTitre(dette.titre)
      setPersonne(dette.personne)
      setMontant(Number(dette.montant))
      setDateFin(dette.date_echeance || '')
      setNote(dette.description || '')
    }
  }, [dette])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier la dette</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Titre" value={titre} onChange={e => setTitre(e.target.value)} />
          <Input placeholder="Personne" value={personne} onChange={e => setPersonne(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Montant total"
            value={montant} onChange={e => setMontant(parseFloat(e.target.value) || 0)} />
          <Input type="date" placeholder="Échéance" value={dateFin} onChange={e => setDateFin(e.target.value)} />
          <Input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} />
          <Button className="w-full" onClick={() => {
            if (!dette) return
            onSave({
              id: dette.id,
              titre, personne, montant,
              date_echeance: dateFin || null,
              description: note || null,
            })
          }}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}