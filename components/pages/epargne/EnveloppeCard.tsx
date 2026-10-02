'use client'

import { Archive, PiggyBank } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  env: any
  readOnly: boolean
  selected?: boolean
  monthlyNet?: number
  onSelect?: () => void
  onArchive?: (id: string) => void
}

export default function EnveloppeCard({ env, readOnly, selected, monthlyNet = 0, onSelect, onArchive }: Props) {
  const objective = Number(env.objectif || 0)
  const balance = Number(env.solde || 0)
  const percent = objective > 0 ? Math.max(0, Math.min(100, Math.round(balance / objective * 100))) : null

  return (
    <Card className={'transition ' + (selected ? 'border-emerald-400/45 bg-emerald-500/[0.05]' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700')}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><PiggyBank className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{env.nom}</p>
              <p className="mt-1 text-sm font-bold text-emerald-300">{formatEuro(balance)}{objective > 0 && <span className="font-normal text-slate-600"> / {formatEuro(objective)}</span>}</p>
            </div>
          </button>
          {!readOnly && (
            <button type="button" title="Archiver" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-800 hover:text-slate-300" onClick={event => { event.stopPropagation(); if (confirm('Archiver « ' + env.nom + ' » ?')) onArchive?.(env.id) }}><Archive className="h-3.5 w-3.5" /></button>
          )}
        </div>

        {percent !== null && (
          <div className="mt-3">
            <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{width:String(percent)+'%'}} /></div><span className="w-8 text-right text-[10px] font-medium text-slate-400">{percent}%</span></div>
          </div>
        )}

        <p className={'mt-2 text-[10px] ' + (monthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
          {monthlyNet >= 0 ? '+' : '−'}{formatEuro(Math.abs(monthlyNet))} ce mois
        </p>
      </CardContent>
    </Card>
  )
}
