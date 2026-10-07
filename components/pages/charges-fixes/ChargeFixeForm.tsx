'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'

type RecurrenceMode = 'monthly' | 'custom'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    nom: string
    montant: number
    frequence: number
    jourPrevu: number
  }) => Promise<void>
}

export default function ChargeFixeForm({
  open,
  onOpenChange,
  onSubmit,
}: Props) {
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('monthly')
  const [customFrequency, setCustomFrequency] = useState(2)
  const [jourPrevu, setJourPrevu] = useState<number | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const frequency = recurrenceMode === 'monthly'
    ? 1
    : Math.max(2, customFrequency || 2)

  const resetAll = () => {
    reset()
    setRecurrenceMode('monthly')
    setCustomFrequency(2)
    setJourPrevu(null)
  }

  const doSubmit = async (values: { nom: string; montant: number }) => {
    await onSubmit({
      nom: values.nom,
      montant: values.montant,
      frequence: frequency,
      jourPrevu: Math.min(31, Math.max(1, Number(jourPrevu || 1))),
    })
    resetAll()
  }

  return (
    <Dialog open={open} onOpenChange={value => {
      onOpenChange(value)
      if (!value) resetAll()
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle charge fixe</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(doSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Input placeholder="Nom (ex. Loyer)" {...register('nom', { required: true })} />
            <CalculatorInput value={watch('montant')} onChange={val => setValue('montant', val)} placeholder="Montant prévu" />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Récurrence</p>
              <p className="text-[11px] text-slate-500">Une charge fixe reste classée comme charge fixe, sans catégorie supplémentaire.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
              {([
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

            <label className="block text-xs text-slate-500">Jour prévu <span className="text-slate-600">(facultatif)</span>
              <Input className="mt-1" type="number" min={1} max={31} placeholder="1 par défaut" value={jourPrevu ?? ''} onChange={event => setJourPrevu(event.target.value ? Number(event.target.value) : null)} />
            </label>

            {recurrenceMode === 'custom' && (
              <label className="flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/30 p-2.5">
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

          <Button type="submit" className="w-full" disabled={!watch('nom')?.trim() || Number(watch('montant')) <= 0}>
            Ajouter la charge fixe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
