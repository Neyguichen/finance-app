'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, ReceiptText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuro, localDateISO } from '@/lib/utils'

type Props = {
  tx: any
  reimbursements: any[]
  onClose: () => void
  onCreate: (data: { transaction_id: string; montant: number; note: string | null; date: string }) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export default function RemboursementDialog({ tx, reimbursements, onClose, onCreate, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(localDateISO())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!tx) {
      setAdding(false)
      setAmount(0)
      setNote('')
      setDate(localDateISO())
      setError(null)
    }
  }, [tx])

  const gross = Number(tx?.montant || 0)
  const reimbursed = useMemo(
    () => reimbursements.reduce((sum, reimbursement) => sum + Number(reimbursement.montant), 0),
    [reimbursements],
  )
  const net = Math.max(0, gross - reimbursed)
  const maxNew = Math.max(0, gross - reimbursed)

  const submit = async () => {
    if (!tx || amount <= 0 || saving) return
    setSaving(true)
    setError(null)
    try {
      await onCreate({
        transaction_id: tx.id,
        montant: amount,
        note: note.trim() || null,
        date,
      })
      setAmount(0)
      setNote('')
      setDate(localDateISO())
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’ajouter ce remboursement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!tx} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-emerald-300" />
              Remboursements
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-200">
              {tx?.infos || tx?.categorie?.nom || 'Dépense'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Les remboursements diminuent le coût net de la dépense ; ils ne deviennent pas des revenus.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Dépense" value={gross} />
            <Metric label="Remboursé" value={reimbursed} valueClass="text-emerald-300" />
            <Metric label="Coût net" value={net} valueClass="text-indigo-300" />
          </div>

          {reimbursements.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">Historique</p>
              {reimbursements.map(reimbursement => (
                <div key={reimbursement.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/35 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-300">+ {formatEuro(Number(reimbursement.montant))}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span>{new Date(reimbursement.date + 'T12:00:00').toLocaleDateString('fr-FR')}</span>
                      {reimbursement.note && <span className="truncate">{reimbursement.note}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 hover:text-rose-300"
                    onClick={() => onRemove(reimbursement.id)}
                    aria-label="Supprimer le remboursement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/20 p-4 text-center text-sm text-slate-600">
              Aucun remboursement enregistré.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {!adding ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAdding(true)}
              disabled={maxNew <= 0}
            >
              <Plus className="mr-1 h-4 w-4" />
              {maxNew <= 0 ? 'Dépense déjà intégralement remboursée' : 'Ajouter un remboursement'}
            </Button>
          ) : (
            <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/[0.04] p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-200">Nouveau remboursement</p>
                <span className="text-[11px] text-slate-600">Maximum {formatEuro(maxNew)}</span>
              </div>
              <CalculatorInput value={amount} onChange={setAmount} placeholder="Montant remboursé" />
              <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                <Input placeholder="Note (optionnel)" value={note} onChange={event => setNote(event.target.value)} />
                <Input type="date" value={date} onChange={event => setDate(event.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null) }}>Annuler</Button>
                <Button size="sm" onClick={submit} disabled={amount <= 0 || amount - maxNew > 0.005 || saving}>
                  {saving ? 'Enregistrement…' : 'Ajouter'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Metric({ label, value, valueClass = 'text-slate-100' }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/35 p-3">
      <p className="text-[10px] text-slate-600">{label}</p>
      <p className={'mt-1 text-sm font-semibold ' + valueClass}>{formatEuro(value)}</p>
    </div>
  )
}
