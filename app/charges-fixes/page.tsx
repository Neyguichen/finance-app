'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
import { formatEuro, pct } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useApp } from '@/components/AppContext'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

export default function ChargesFixesPage() {
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; nom: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string; nom: string; montant: number } | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editMontant, setEditMontant] = useState(0)
  const { moisId, month, setMonth, espace } = useApp()
  const { data: charges = [], togglePayee, create, update, remove, removeDefinitif } = useChargesFixes(moisId)
  const { create: createRecurrent } = useChargesFixesRecurrentes(espace?.id)

  const total = charges.reduce((s, c) => s + Number(c.montant), 0)
  const totalPayee = charges.filter(c => c.payee).reduce((s, c) => s + Number(c.montant), 0)
  const aVenir = charges.filter(c => !c.payee).reduce((s, c) => s + Number(c.montant), 0)

  const [formFreq, setFormFreq] = useState(1)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const onSubmit = async (values: { nom: string; montant: number }) => {
    if (!moisId || !espace) return

    if (formFreq === 0) {
      // Ponctuel : pas de modèle récurrent, juste l'instance
      await create.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        nom: values.nom,
        montant: values.montant,
        payee: false,
        ordre: charges.length,
      })
    } else {
      // Récurrent : créer le modèle puis l'instance
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        nom: values.nom,
        montant: values.montant,
        actif: true,
        frequence_mois: formFreq,
        ordre: charges.length,
      })
      await create.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        nom: values.nom,
        montant: values.montant,
        payee: false,
        ordre: charges.length,
      })
    }
    reset()
    setFormFreq(1)
    setOpen(false)
  }

  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (!deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ chargeId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      remove.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleEdit = (charge: { id: string; nom: string; montant: number }) => {
    setEditTarget(charge)
    setEditNom(charge.nom)
    setEditMontant(Number(charge.montant))
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    await update.mutateAsync({
      id: editTarget.id,
      nom: editNom,
      montant: editMontant,
    })
    setEditTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Charges Fixes</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader><DialogTitle>Nouvelle charge fixe</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input placeholder="Nom (ex: Loyer)" {...register('nom', { required: true })} />
                <CalculatorInput value={watch('montant')} onChange={(val) => setValue('montant', val)} placeholder="Montant" />

                {/* Sélecteur de fréquence */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                  <div className="grid grid-cols-5 gap-1">
                    {FREQUENCES.map(f => (
                      <button key={f.value} type="button" onClick={() => setFormFreq(f.value)}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
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
        </div>

        {/* TOTAL EN HAUT */}
        <Card className="bg-purple-950 border-purple-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatEuro(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payé ({pct(totalPayee, total)}%)</span>
              <span>{formatEuro(totalPayee)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>À venir</span>
              <span>{formatEuro(aVenir)}</span>
            </div>
          </CardContent>
        </Card>

        {/* LISTE DES CHARGES */}
        <div className="space-y-2">
          {charges.map((charge) => (
            <Card key={charge.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={charge.payee}
                    onCheckedChange={(checked) =>
                      togglePayee.mutate({ id: charge.id, payee: !!checked })
                    }
                  />
                  <div>
                    <p className={charge.payee ? 'line-through text-slate-500' : 'font-medium'}>
                      {charge.nom}
                    </p>
                    {charge.recurrent_id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-400">{formatEuro(Number(charge.montant))}</span>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                    onClick={() => handleEdit({ id: charge.id, nom: charge.nom, montant: Number(charge.montant) })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                    onClick={() => setDeleteTarget({ id: charge.id, recurrentId: charge.recurrent_id, nom: charge.nom })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* DIALOG D'ÉDITION */}
        <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Modifier la charge fixe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
              <CalculatorInput value={watch('montant')} onChange={(val) => setValue('montant', val)} placeholder="Montant" />
              <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE SUPPRESSION */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Supprimer &laquo; {deleteTarget?.nom} &raquo; ?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => handleDelete('mois')}>
                Ce mois seulement
              </Button>
              {deleteTarget?.recurrentId && (
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete('definitif')}>
                  Définitivement (ne plus reporter)
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}