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
  onOpenChange: (v: boolean) => void
  onSubmit: (values: { nom: string; montant: number; type: 'actif' | 'passif'; frequence: number }) => Promise<void>
}

export default function RevenuForm({ open, onOpenChange, onSubmit }: Props) {
  const [formType, setFormType] = useState<'actif' | 'passif'>('actif')
  const [formFreq, setFormFreq] = useState(1)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const handleFormSubmit = async (values: { nom: string; montant: number }) => {
    await onSubmit({ ...values, type: formType, frequence: formFreq })
    reset()
    setFormType('actif')
    setFormFreq(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouveau revenu</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input placeholder="Nom" {...register('nom', { required: true })} />
          <CalculatorInput value={watch('montant')} onChange={(val) => setValue('montant', val)} placeholder="Montant" />
          {/* Toggle Actif / Passif */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormType('actif')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'actif' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>Actif</button>
              <button type="button" onClick={() => setFormType('passif')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'passif' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>Passif</button>
            </div>
          </div>
          {/* Sélecteur de fréquence */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
            <div className="grid flex-wrap gap-1">
              {FREQUENCES.map(f => (
                <button key={f.value} type="button" onClick={() => setFormFreq(f.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors flex-1 min-w-[4.5rem] ${
                    formFreq === f.value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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