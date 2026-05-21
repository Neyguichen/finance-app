'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'

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
  onSubmit: (values: { nom: string; montant: number; frequence: number }) => Promise<void>
}

export default function ChargeFixeForm({ open, onOpenChange, onSubmit }: Props) {
  const [formFreq, setFormFreq] = useState(1)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const doSubmit = async (values: { nom: string; montant: number }) => {
    await onSubmit({ ...values, frequence: formFreq })
    reset()
    setFormFreq(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouvelle charge fixe</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(doSubmit)} className="space-y-4">
          <Input placeholder="Nom (ex: Loyer)" {...register('nom', { required: true })} />
          <CalculatorInput value={watch('montant')} onChange={(val) => setValue('montant', val)} placeholder="Montant" />
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
            <div className="grid flex-wrap gap-1">
              {FREQUENCES.map(f => (
                <button key={f.value} type="button" onClick={() => setFormFreq(f.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors flex-1 min-w-[4.5rem] ${
                    formFreq === f.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full">Ajouter</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}