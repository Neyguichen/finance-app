'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type EditEnvData = {
  id: string; nom: string; objectif: number | null;
  solde: number; solde_initial: number
} | null

type Props = {
  editEnv: EditEnvData
  onClose: () => void
  onSave: (data: {
    id: string; nom: string; objectif: number | null;
    solde_initial: number; solde: number
  }) => void
}

export default function EnveloppeEditDialog({ editEnv, onClose, onSave }: Props) {
  const [nom, setNom] = useState('')
  const [objectif, setObjectif] = useState<number | null>(null)
  const [soldeInitial, setSoldeInitial] = useState(0)

  useEffect(() => {
    if (editEnv) {
      setNom(editEnv.nom)
      setObjectif(editEnv.objectif)
      setSoldeInitial(Number(editEnv.solde_initial) || 0)
    }
  }, [editEnv])

  const handleSave = () => {
    if (!editEnv) return
    const oldInitial = Number(editEnv.solde_initial) || 0
    const diff = soldeInitial - oldInitial
    onSave({
      id: editEnv.id,
      nom,
      objectif,
      solde_initial: soldeInitial,
      solde: Number(editEnv.solde) + diff,
    })
  }

  return (
    <Dialog open={!!editEnv} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier l&apos;enveloppe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Nom</label>
            <Input value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Objectif (€)</label>
            <CalculatorInput value={objectif ?? 0} onChange={v => setObjectif(v || null)} placeholder="Laisser vide = pas d'objectif" />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Solde Initial (€)</label>
            <CalculatorInput value={soldeInitial} onChange={setSoldeInitial} placeholder="Solde initial" />
          </div>
          <Button className="w-full" onClick={handleSave}>Enregistrer</Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}