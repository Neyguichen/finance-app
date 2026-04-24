'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowUpDown } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useEnveloppes, useMouvements } from '@/lib/hooks/useEpargne'
import { formatEuro, pct } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { useApp } from '@/components/AppContext'

export default function EpargnePage() {
  const { moisId, month, setMonth, espace } = useApp()
  const [mvtOpen, setMvtOpen] = useState(false)
  const espaceId = espace?.id

  const { data: enveloppes = [] } = useEnveloppes(espaceId)
  const { create: createMvt } = useMouvements(moisId)

  const totalSolde = enveloppes.reduce((s, e) => s + Number(e.solde), 0)

  const { register, handleSubmit, control, reset, watch } = useForm({
    defaultValues: {
      type: 'alimentation' as 'alimentation' | 'reprise' | 'transfert',
      source: '',
      destination: '',
      montant: 0,
    },
  })
  const mvtType = watch('type')

  const onSubmitMvt = async (values: any) => {
    if (!moisId) return
    await createMvt.mutateAsync({
      mois_id: moisId,
      type: values.type,
      enveloppe_source_id: values.type !== 'alimentation' ? values.source : null,
      enveloppe_dest_id: values.type !== 'reprise' ? values.destination : null,
      montant: values.montant,
      date: new Date().toISOString().split('T')[0],
      note: null,
      recurrent_id: null,
    })
    reset()
    setMvtOpen(false)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Épargne</h1>
          <Dialog open={mvtOpen} onOpenChange={setMvtOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><ArrowUpDown className="w-4 h-4 mr-1" />Mouvement</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader><DialogTitle>Mouvement d&apos;épargne</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmitMvt)} className="space-y-4">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alimentation">Alimenter</SelectItem>
                        <SelectItem value="reprise">Reprendre</SelectItem>
                        <SelectItem value="transfert">Transférer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {mvtType !== 'alimentation' && (
                  <Controller
                    name="source"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                        <SelectContent>
                          {enveloppes.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {mvtType !== 'reprise' && (
                  <Controller
                    name="destination"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                        <SelectContent>
                          {enveloppes.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                <Input type="number" step="0.01" placeholder="Montant" {...register('montant', { valueAsNumber: true })} />
                <Button type="submit" className="w-full">Valider</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!espace && (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-sm">
            Crée un espace depuis le Dashboard pour activer les enveloppes.
          </div>
        )}

        <div className="space-y-3">
          {enveloppes.map((env) => (
            <Card key={env.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{env.nom}</p>
                  <p className="font-bold text-teal-400">{formatEuro(Number(env.solde))}</p>
                </div>
                {env.objectif && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{pct(Number(env.solde), Number(env.objectif))}%</span>
                      <span>Obj: {formatEuro(Number(env.objectif))}</span>
                    </div>
                    <Progress value={pct(Number(env.solde), Number(env.objectif))} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-teal-950 border-teal-800">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <span className="font-semibold">Total Épargne</span>
              <span className="font-bold text-lg text-teal-300">{formatEuro(totalSolde)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}