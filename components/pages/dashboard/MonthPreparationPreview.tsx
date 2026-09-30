'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMonthPreparation } from '@/lib/hooks/useMonthPreparation'

type Mode = 'previous' | 'habits'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  espaceId?: string
  month: string
  mode: Mode | null
  onConfirm: (selectedIds: string[]) => Promise<void>
  isRefresh?: boolean
}

const kindLabel = { income: 'Revenus', fixed: 'Charges fixes', savings: 'Épargne', budget: 'Budgets variables' }

export default function MonthPreparationPreview({ open, onOpenChange, espaceId, month, mode, onConfirm, isRefresh = false }: Props) {
  const preview = useMonthPreparation(espaceId, month, mode)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelected(new Set((preview.data?.items || []).filter(item => item.selected).map(item => item.id)))
  }, [preview.data])

  const items = preview.data?.items || []
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    ;(acc[item.kind] ||= []).push(item)
    return acc
  }, {})

  const confirm = async () => {
    setSaving(true)
    try {
      await onConfirm(Array.from(selected))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const normalizedMonth = month.slice(0, 7)
  const monthLabel = new Date(`${normalizedMonth}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-11/12 max-w-lg mx-auto">
    <DialogHeader><DialogTitle>{isRefresh ? 'Actualiser' : 'Préparer'} {monthLabel}</DialogTitle></DialogHeader>
    {preview.isLoading ? <div className="py-8 text-center"><span className="loading loading-spinner" /></div> : <>
      <p className="text-sm text-slate-400">{mode === 'previous' ? `Propositions reprises de ${preview.data?.sourceMonth || 'ton dernier mois préparé'}.` : isRefresh ? 'Seules les nouvelles récurrences absentes de ce mois sont proposées. Les éléments déjà présents ne seront ni dupliqués ni écrasés.' : 'Récurrences actives prévues pour ce mois.'} Décoche ce que tu ne souhaites pas créer.</p>
      {items.length === 0 ? <p className="py-6 text-sm text-slate-400 text-center">{isRefresh ? 'Aucune nouvelle récurrence à ajouter à ce mois.' : 'Aucun élément à proposer. Tu peux commencer ce mois de zéro.'}</p> :
        <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">{Object.entries(grouped).map(([kind, rows]) => <div key={kind}>
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{kindLabel[kind as keyof typeof kindLabel]}</p>
          <div className="space-y-2">{rows.map(item => <label key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-700 p-3 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-sm" checked={selected.has(item.id)} onChange={() => setSelected(current => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next })} />
            <span className="flex-1 text-sm">{item.label}</span><span className="text-sm tabular-nums">{item.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
          </label>)}</div>
        </div>)}</div>}
      <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button><Button onClick={confirm} disabled={saving || (isRefresh && selected.size === 0)}>{saving ? 'Enregistrement…' : isRefresh ? (selected.size ? `Ajouter ${selected.size} élément${selected.size > 1 ? 's' : ''}` : 'À jour') : selected.size ? `Créer avec ${selected.size} élément${selected.size > 1 ? 's' : ''}` : 'Créer le mois vide'}</Button></div>
    </>}
  </DialogContent></Dialog>
}
