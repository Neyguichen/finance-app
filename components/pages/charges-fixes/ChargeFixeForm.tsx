'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'

type RecurrenceMode = 'once' | 'monthly' | 'custom'
type CategoryOption = { id: string; nom: string; icone?: string | null; parent_id?: string | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories?: CategoryOption[]
  onSubmit: (values: { nom: string; montant: number; frequence: number; categorie_id?: string | null }) => Promise<void>
}

export default function ChargeFixeForm({ open, onOpenChange, categories = [], onSubmit }: Props) {
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('monthly')
  const [customFrequency, setCustomFrequency] = useState(2)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0, categorie_id: '' },
  })

  const frequency = recurrenceMode === 'once'
    ? 0
    : recurrenceMode === 'monthly'
      ? 1
      : Math.max(2, customFrequency || 2)

  const doSubmit = async (values: { nom: string; montant: number; categorie_id?: string }) => {
    await onSubmit({ ...values, categorie_id: values.categorie_id || null, frequence: frequency })
    reset()
    setRecurrenceMode('monthly')
    setCustomFrequency(2)
  }

  const parentCategories = categories.filter(category => !category.parent_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle charge fixe</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(doSubmit)} className="space-y-4">
          <Input placeholder="Nom (ex. Loyer)" {...register('nom', { required: true })} />
          <CalculatorInput value={watch('montant')} onChange={val => setValue('montant', val)} placeholder="Montant prévu" />

          {parentCategories.length > 0 && (
            <select {...register('categorie_id')} className="select select-bordered w-full">
              <option value="">Sans catégorie</option>
              {parentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icone ? `${category.icone} ` : ''}{category.nom}
                </option>
              ))}
            </select>
          )}

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

          <Button type="submit" className="w-full">Ajouter la charge fixe</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
