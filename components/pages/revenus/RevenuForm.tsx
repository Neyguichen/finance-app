'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'

type RecurrenceMode = 'once' | 'monthly' | 'custom'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (values: { nom: string; montant: number; type: 'actif' | 'passif'; frequence: number; datePrevue: string | null }) => Promise<void>
}

export default function RevenuForm({ open, onOpenChange, onSubmit }: Props) {
  const [formType, setFormType] = useState<'actif' | 'passif'>('actif')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('monthly')
  const [customFrequency, setCustomFrequency] = useState(2)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0, datePrevue: '' },
  })

  const frequency = recurrenceMode === 'once'
    ? 0
    : recurrenceMode === 'monthly'
      ? 1
      : Math.max(2, customFrequency || 2)

  const handleFormSubmit = async (values: { nom: string; montant: number; datePrevue: string }) => {
    await onSubmit({
      nom: values.nom,
      montant: values.montant,
      datePrevue: values.datePrevue || null,
      type: formType,
      frequence: frequency,
    })
    reset()
    setFormType('actif')
    setRecurrenceMode('monthly')
    setCustomFrequency(2)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau revenu</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input placeholder="Nom du revenu" {...register('nom', { required: true })} />
          <CalculatorInput value={watch('montant')} onChange={val => setValue('montant', val)} placeholder="Montant" />

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Date prévue <span className="text-xs text-slate-600">(facultative)</span>
            </label>
            <Input type="date" {...register('datePrevue')} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Type</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
              <button
                type="button"
                onClick={() => setFormType('actif')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${formType === 'actif' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Actif
              </button>
              <button
                type="button"
                onClick={() => setFormType('passif')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${formType === 'passif' ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Passif
              </button>
            </div>
          </div>

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

          <Button type="submit" className="w-full">Ajouter le revenu</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
