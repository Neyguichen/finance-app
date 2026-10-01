'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuro } from '@/lib/utils'

type RecurrenceMode = 'once' | 'monthly' | 'custom'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  enveloppesActives: any[]
  onCreateEnvelope?: (name: string) => Promise<{ id: string }>
  initialType?: 'epargne' | 'reprise' | 'transfert'
  onSubmit: (data: {
    type: 'epargne' | 'reprise' | 'transfert'
    montant: number
    note: string | null
    sourceId: string | null
    destId: string | null
    frequence: number
  }) => Promise<void>
}

export default function MouvementForm({ open, onOpenChange, enveloppesActives, onCreateEnvelope, initialType = 'epargne', onSubmit }: Props) {
  const [type, setType] = useState<'epargne' | 'reprise' | 'transfert'>(initialType)

  useEffect(() => {
    if (open) setType(initialType)
  }, [open, initialType])
  const [montant, setMontant] = useState(0)
  const [note, setNote] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [destId, setDestId] = useState('')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('monthly')
  const [customFrequency, setCustomFrequency] = useState(2)
  const [creatingEnvelope, setCreatingEnvelope] = useState(false)
  const [newEnvelopeName, setNewEnvelopeName] = useState('')
  const [savingEnvelope, setSavingEnvelope] = useState(false)

  const sourceRequired = type === 'reprise' || type === 'transfert'
  const destRequired = type === 'epargne' || type === 'transfert'
  const sameEnvelope = type === 'transfert' && Boolean(sourceId) && sourceId === destId
  const canSubmit = montant > 0 && (!sourceRequired || Boolean(sourceId)) && (!destRequired || Boolean(destId)) && !sameEnvelope
  const frequency = type !== 'epargne'
    ? 0
    : recurrenceMode === 'once'
      ? 0
      : recurrenceMode === 'monthly'
        ? 1
        : Math.max(2, customFrequency || 2)

  const handleSubmit = async () => {
    if (!canSubmit) return
    await onSubmit({
      type,
      montant,
      note: note || null,
      sourceId: sourceRequired ? (sourceId || null) : null,
      destId: destRequired ? (destId || null) : null,
      frequence: frequency,
    })
    setMontant(0)
    setNote('')
    setSourceId('')
    setDestId('')
    setRecurrenceMode('monthly')
    setCustomFrequency(2)
    setCreatingEnvelope(false)
    setNewEnvelopeName('')
  }

  const createEnvelope = async () => {
    if (!onCreateEnvelope || !newEnvelopeName.trim() || savingEnvelope) return
    setSavingEnvelope(true)
    try {
      const created = await onCreateEnvelope(newEnvelopeName.trim())
      setDestId(created.id)
      setNewEnvelopeName('')
      setCreatingEnvelope(false)
    } finally {
      setSavingEnvelope(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau mouvement d’épargne</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Type de mouvement</label>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
              {(['epargne', 'reprise', 'transfert'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${type === value ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {value === 'epargne' ? 'Épargner' : value === 'reprise' ? 'Reprendre' : 'Transférer'}
                </button>
              ))}
            </div>
          </div>

          <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />

          {sourceRequired && (
            <div>
              <label className="mb-1 block text-sm text-slate-400">Depuis</label>
              <select
                className="select select-bordered w-full"
                value={sourceId}
                onChange={event => setSourceId(event.target.value)}
              >
                <option value="">Sélectionner une enveloppe</option>
                {enveloppesActives.map((env: any) => (
                  <option key={env.id} value={env.id} disabled={type === 'transfert' && env.id === destId}>
                    {env.nom} ({formatEuro(Number(env.solde))})
                  </option>
                ))}
              </select>
            </div>
          )}

          {destRequired && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-400">Vers</label>
                {onCreateEnvelope && !creatingEnvelope && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                    onClick={() => setCreatingEnvelope(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle enveloppe
                  </button>
                )}
              </div>

              <select
                className="select select-bordered w-full"
                value={destId}
                onChange={event => setDestId(event.target.value)}
              >
                <option value="">Sélectionner une enveloppe</option>
                {enveloppesActives.map((env: any) => (
                  <option key={env.id} value={env.id} disabled={type === 'transfert' && env.id === sourceId}>
                    {env.nom}
                  </option>
                ))}
              </select>

              {creatingEnvelope && onCreateEnvelope && (
                <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
                  <div className="flex gap-2">
                    <Input
                      value={newEnvelopeName}
                      onChange={event => setNewEnvelopeName(event.target.value)}
                      placeholder="Nom de la nouvelle enveloppe"
                      onKeyDown={event => { if (event.key === 'Enter') createEnvelope() }}
                      autoFocus
                    />
                    <Button size="sm" onClick={createEnvelope} disabled={!newEnvelopeName.trim() || savingEnvelope}>
                      {savingEnvelope ? '…' : 'Créer'}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setCreatingEnvelope(false); setNewEnvelopeName('') }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    L’enveloppe sera créée puis sélectionnée automatiquement pour ce mouvement.
                  </p>
                </div>
              )}
            </div>
          )}

          {sameEnvelope && <p className="text-xs text-rose-400">La source et la destination doivent être différentes.</p>}

          <Input placeholder="Note (optionnel)" value={note} onChange={event => setNote(event.target.value)} />

          {type === 'epargne' && (
            <div>
              <label className="mb-1 block text-sm text-slate-400">Récurrence</label>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
                {([
                  ['once', 'Cette fois'],
                  ['monthly', 'Tous les mois'],
                  ['custom', 'Tous les X mois'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRecurrenceMode(value)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition ${recurrenceMode === value ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recurrenceMode === 'custom' && (
                <label className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/30 p-2.5">
                  <span className="text-xs text-slate-500">Répéter tous les</span>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={customFrequency}
                    onChange={event => setCustomFrequency(Math.max(2, Number(event.target.value) || 2))}
                    className="input input-bordered input-sm w-20 text-center"
                  />
                  <span className="text-xs text-slate-500">mois</span>
                </label>
              )}
            </div>
          )}

          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            Ajouter le mouvement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
