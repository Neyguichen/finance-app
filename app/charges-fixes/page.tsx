'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { formatEuro, pct } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useApp } from '@/components/AppContext'

export default function ChargesFixesPage() {
  const { moisId, month, setMonth } = useApp()
  const [open, setOpen] = useState(false)
  const { data: charges = [], togglePayee, create, remove } = useChargesFixes(moisId)

  const total = charges.reduce((s, c) => s + Number(c.montant), 0)
  const totalPayee = charges.filter(c => c.payee).reduce((s, c) => s + Number(c.montant), 0)
  const aVenir = charges.filter(c => !c.payee).reduce((s, c) => s + Number(c.montant), 0)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const onSubmit = async (values: { nom: string; montant: number }) => {
    if (!moisId) return
    await create.mutateAsync({
      mois_id: moisId,
      nom: values.nom,
      montant: values.montant,
      payee: false,
      ordre: charges.length,
    })
    reset()
    setOpen(false)
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
                <Input type="number" step="0.01" placeholder="Montant" {...register('montant', { valueAsNumber: true })} />
                <Button type="submit" className="w-full">Ajouter</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                  <p className={charge.payee ? 'line-through text-slate-500' : 'font-medium'}>
                    {charge.nom}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-400">{formatEuro(Number(charge.montant))}</span>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8" onClick={() => remove.mutate(charge.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-purple-950 border-purple-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatEuro(total)}</span>
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
      </div>
    </div>
  )
}