'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { nom: string; objectif: number | null; solde_initial: number | null }) => Promise<void>
}

export default function EnveloppeForm({ open, onOpenChange, onSubmit }: Props) {
  const [nom, setNom] = useState('')
  const [objectif, setObjectif] = useState<number | null>(null)
  const [solde, setSolde] = useState<number | null>(null)

  const handleSubmit = async () => {
    if (!nom.trim()) return
    await onSubmit({ nom: nom.trim(), objectif, solde_initial: solde })
    setNom(''); setObjectif(null); setSolde(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouvelle enveloppe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nom (ex: Vacances)" value={nom} onChange={e => setNom(e.target.value)} />
          <CalculatorInput value={objectif ?? 0} onChange={v => setObjectif(v || null)} placeholder="Objectif (optionnel)" />
          <CalculatorInput value={solde ?? 0} onChange={v => setSolde(v || null)} placeholder="Solde initial (optionnel)" />
          <Button className="w-full" onClick={handleSubmit}>Créer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}