'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { localDateISO } from '@/lib/utils'

type RecurrenceMode = 'once' | 'monthly' | 'custom'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  doubleDate?: boolean
  recurringOnly?: boolean
  onSubmit: (values: {
    nom: string
    montant: number
    montantReel: number | null
    type: 'actif' | 'passif'
    frequence: number
    jourPrevu: number
    datePrevue: string | null
    recu: boolean
    dateReelle: string | null
  }) => Promise<void>
}

export default function RevenuForm({ open, onOpenChange, onSubmit, doubleDate = false, recurringOnly = false }: Props) {
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState(0)
  const [montantReel, setMontantReel] = useState<number | null>(null)
  const [formType, setFormType] = useState<'actif' | 'passif'>('actif')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>(recurringOnly ? 'monthly' : 'once')
  const [customFrequency, setCustomFrequency] = useState(2)
  const [jourPrevu, setJourPrevu] = useState<number | null>(null)
  const [datePrevue, setDatePrevue] = useState('')
  const [recu, setRecu] = useState(false)
  const [dateReelle, setDateReelle] = useState('')

  const frequency = recurrenceMode === 'once' ? 0 : recurrenceMode === 'monthly' ? 1 : Math.max(2, customFrequency || 2)
  const recurring = frequency > 0

  const resetAll = () => {
    setNom('')
    setMontant(0)
    setMontantReel(null)
    setFormType('actif')
    setRecurrenceMode(recurringOnly ? 'monthly' : 'once')
    setCustomFrequency(2)
    setJourPrevu(null)
    setDatePrevue('')
    setRecu(false)
    setDateReelle('')
  }

  const submit = async () => {
    if (!nom.trim() || montant <= 0) return
    await onSubmit({
      nom: nom.trim(),
      montant,
      montantReel: recu ? Number(montantReel ?? montant) : null,
      type: formType,
      frequence: frequency,
      jourPrevu: Math.min(31, Math.max(1, Number(jourPrevu || 1))),
      datePrevue: recurring ? null : (datePrevue || null),
      recu,
      dateReelle: recu ? (dateReelle || localDateISO()) : null,
    })
    resetAll()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={value => { onOpenChange(value); if (!value) resetAll() }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{recurringOnly ? 'Nouveau revenu récurrent' : 'Nouveau revenu'}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
            <Input placeholder="Nom du revenu" value={nom} onChange={event => setNom(event.target.value)} />
            <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant prévu" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-slate-500">Type</p>
              <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/35 p-1">
                {(['actif','passif'] as const).map(value => (
                  <button key={value} type="button" onClick={() => setFormType(value)}
                    className={'rounded-lg px-3 py-2 text-xs font-medium transition ' + (formType === value ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300')}>
                    {value === 'actif' ? 'Actif' : 'Passif'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-slate-500">Récurrence</p>
              <div className={'grid rounded-xl border border-slate-800 bg-slate-950/35 p-1 ' + (recurringOnly ? 'grid-cols-2' : 'grid-cols-3')}>
                {!recurringOnly && <button type="button" onClick={() => setRecurrenceMode('once')} className={'rounded-lg px-2 py-2 text-xs ' + (recurrenceMode === 'once' ? 'bg-indigo-500 text-white' : 'text-slate-500')}>Cette fois</button>}
                <button type="button" onClick={() => setRecurrenceMode('monthly')} className={'rounded-lg px-2 py-2 text-xs ' + (recurrenceMode === 'monthly' ? 'bg-indigo-500 text-white' : 'text-slate-500')}>Mensuel</button>
                <button type="button" onClick={() => setRecurrenceMode('custom')} className={'rounded-lg px-2 py-2 text-xs ' + (recurrenceMode === 'custom' ? 'bg-indigo-500 text-white' : 'text-slate-500')}>Tous les X mois</button>
              </div>
            </div>
          </div>

          {recurring ? (
            <div className="grid gap-3 rounded-xl border border-slate-800/70 bg-slate-950/25 p-3 sm:grid-cols-2">
              {recurrenceMode === 'custom' && (
                <label className="text-xs text-slate-500">Fréquence
                  <div className="mt-1 flex items-center gap-2"><span>Tous les</span><input type="number" min={2} max={60} value={customFrequency} onChange={e => setCustomFrequency(Math.max(2, Number(e.target.value) || 2))} className="input input-bordered input-sm w-20 text-center" /><span>mois</span></div>
                </label>
              )}
              <label className="text-xs text-slate-500">Jour prévu <span className="text-slate-600">(facultatif)</span>
                <Input className="mt-1" type="number" min={1} max={31} placeholder="1 par défaut" value={jourPrevu ?? ''} onChange={e => setJourPrevu(e.target.value ? Number(e.target.value) : null)} />
              </label>
            </div>
          ) : (
            <label className="block text-xs text-slate-500">Date prévue <span className="text-slate-600">(facultatif)</span>
              <Input className="mt-1" type="date" value={datePrevue} onChange={event => setDatePrevue(event.target.value)} />
            </label>
          )}

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={recu} onCheckedChange={checked => { const next=!!checked; setRecu(next); if(next && montantReel == null) setMontantReel(montant); if(!next){setMontantReel(null);setDateReelle('')} }} />
              <span><span className="block text-sm font-medium text-slate-200">Revenu déjà reçu</span><span className="block text-[11px] text-slate-500">À laisser décoché pour un revenu simplement prévu.</span></span>
            </label>
            {recu && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-500">Montant réellement reçu
                  <CalculatorInput value={Number(montantReel ?? montant)} onChange={setMontantReel} placeholder="Montant reçu" />
                </label>
                {doubleDate && <label className="text-xs text-slate-500">Date de validation <span className="text-slate-600">(facultatif)</span><Input className="mt-1" type="date" value={dateReelle} onChange={event => setDateReelle(event.target.value)} /></label>}
              </div>
            )}
          </div>

          <Button className="w-full" disabled={!nom.trim() || montant <= 0} onClick={submit}>{recurringOnly ? 'Ajouter la récurrence' : 'Ajouter le revenu'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
