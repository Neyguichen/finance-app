'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { useRemboursements } from '@/lib/hooks/useRemboursements'

type Props = {
  tx: any
  onClose: () => void
}

export default function RemboursementDialog({ tx, onClose }: Props) {
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(tx?.id)
  const [montant, setMontant] = useState(0)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  return (
    <Dialog open={!!tx} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Remboursements — {tx?.infos || tx?.categorie?.nom || 'Dépense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            Dépense initiale : <span className="text-pink-400 font-bold">{formatEuro(Number(tx?.montant || 0))}</span>
          </div>
          {/* Liste des remboursements existants */}
          {remboursements.length > 0 && (
            <div className="space-y-2">
              {remboursements.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                  <div>
                    <span className="text-sm text-emerald-400 font-semibold">+{formatEuro(Number(r.montant))}</span>
                    {r.note && <span className="text-xs text-slate-500 ml-2">{r.note}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-6 w-6"
                    onClick={() => removeRemb.mutate(r.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {/* Ajouter un remboursement */}
          <div className="border-t border-slate-700 pt-3 space-y-3">
            <p className="text-sm font-semibold">Ajouter un remboursement</p>
            <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant" />
            <Input placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Button className="w-full" onClick={async () => {
              if (!tx || !montant) return
              await createRemb.mutateAsync({
                transaction_id: tx.id, montant, note: note || null, date,
              })
              setMontant(0)
              setNote('')
            }}>Ajouter</Button>
          </div>
          <Button className="w-full" variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}