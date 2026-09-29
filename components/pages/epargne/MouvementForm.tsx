'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuro } from '@/lib/utils'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  enveloppesActives: any[]
  onSubmit: (data: {
    type: 'epargne' | 'reprise' | 'transfert'
    montant: number
    note: string | null
    sourceId: string | null
    destId: string | null
    frequence: number
  }) => Promise<void>
}

export default function MouvementForm({ open, onOpenChange, enveloppesActives, onSubmit }: Props) {
  const [type, setType] = useState<'epargne' | 'reprise' | 'transfert'>('epargne')
  const [montant, setMontant] = useState(0)
  const [note, setNote] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [destId, setDestId] = useState('')
  const [freq, setFreq] = useState(1)

  const sourceRequired = type === 'reprise' || type === 'transfert'
  const destRequired = type === 'epargne' || type === 'transfert'
  const sameEnvelope = type === 'transfert' && Boolean(sourceId) && sourceId === destId
  const canSubmit = montant > 0 && (!sourceRequired || Boolean(sourceId)) && (!destRequired || Boolean(destId)) && !sameEnvelope

  const handleSubmit = async () => {
    if (!canSubmit) return
    await onSubmit({
      type,
      montant,
      note: note || null,
      sourceId: sourceRequired ? (sourceId || null) : null,
      destId: destRequired ? (destId || null) : null,
      frequence: type === 'epargne' ? freq : 0,
    })
    setMontant(0); setNote(''); setSourceId(''); setDestId(''); setFreq(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Type</label>
            <div className="flex gap-2">
              {(['epargne', 'reprise', 'transfert'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    type === t ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>
                  {t === 'epargne' ? 'Épargner' : t === 'reprise' ? 'Reprendre' : 'Transférer'}
                </button>
              ))}
            </div>
          </div>
          <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />
          {destRequired && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Vers</label>
              <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                value={destId} onChange={e => setDestId(e.target.value)}>
                <option value="">Sélectionner...</option>
                {enveloppesActives.map((env: any) => (
                  <option key={env.id} value={env.id} disabled={type === 'transfert' && env.id === sourceId}>{env.nom}</option>
                ))}
              </select>
            </div>
          )}
          {sourceRequired && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Depuis</label>
              <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                value={sourceId} onChange={e => setSourceId(e.target.value)}>
                <option value="">Sélectionner...</option>
                {enveloppesActives.map((env: any) => (
                  <option key={env.id} value={env.id} disabled={type === 'transfert' && env.id === destId}>{env.nom} ({formatEuro(Number(env.solde))})</option>
                ))}
              </select>
            </div>
          )}
          {sameEnvelope && <p className="text-xs text-red-400">La source et la destination doivent être différentes.</p>}
          <Input placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
          {type === 'epargne' && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
              <div className="grid flex-wrap gap-1">
                {FREQUENCES.map(f => (
                  <button key={f.value} type="button" onClick={() => setFreq(f.value)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors flex-1 min-w-[4.5rem] ${
                      freq === f.value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}>{f.label}</button>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>Ajouter</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}