'use client'

import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, PiggyBank, ShieldCheck, WalletCards } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type EnvelopeShare = { id: string; name: string; balance: number }

type Props = {
  totalDisponible: number
  totalEpargne: number
  totalReprise: number
  enveloppes: EnvelopeShare[]
  onSave: () => void
  onWithdraw: () => void
  onTransfer: () => void
  readOnly?: boolean
}

const colors = ['bg-emerald-400','bg-cyan-400','bg-fuchsia-400','bg-amber-400','bg-blue-400','bg-rose-400']

export default function EpargneResume({
  totalDisponible, totalEpargne, totalReprise, enveloppes, onSave, onWithdraw, onTransfer, readOnly = false,
}: Props) {
  const positive = enveloppes
    .filter(env => env.balance > 0)
    .sort((a, b) => b.balance - a.balance)
  const total = positive.reduce((sum, env) => sum + env.balance, 0)

  return (
    <Card className="nf-card-hover">
      <CardContent className="p-3 sm:p-4">
        <div className="grid gap-3 xl:grid-cols-[1.45fr_.75fr]">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-400/15 bg-sky-500/[0.06] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-sky-300"><PiggyBank className="h-4 w-4" />Total épargné</div>
              <p className="mt-1.5 text-xl font-bold text-sky-300">{formatEuro(totalDisponible)}</p>
            </div>
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-300"><ShieldCheck className="h-4 w-4" />Épargné ce mois</div>
              <p className="mt-1.5 text-xl font-bold text-emerald-300">+ {formatEuro(totalEpargne)}</p>
            </div>
            <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.06] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-rose-300"><ArrowUpFromLine className="h-4 w-4" />Repris ce mois</div>
              <p className="mt-1.5 text-xl font-bold text-rose-300">− {formatEuro(totalReprise)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/25 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300"><WalletCards className="h-4 w-4 text-indigo-300" />Répartition par enveloppe</div>
            {total > 0 ? (
              <>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-800">
                  {positive.map((env, index) => <div key={env.id} className={colors[index % colors.length]} style={{ width: String((env.balance / total) * 100) + '%' }} />)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  {positive.map((env, index) => (
                    <div key={env.id} className="flex min-w-0 items-center gap-1.5">
                      <span className={'h-2 w-2 shrink-0 rounded-full ' + colors[index % colors.length]} />
                      <span className="truncate">{env.name}</span>
                      <span className="ml-auto text-slate-400">{Math.round((env.balance / total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="mt-3 text-xs text-slate-600">Aucune épargne disponible.</p>}
          </div>
        </div>

        {!readOnly && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={onSave} className="btn btn-primary btn-sm min-w-0 flex-col gap-1 px-1 py-2 text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"><ArrowDownToLine className="h-4 w-4 shrink-0" /><span className="min-w-0">Épargner</span></button>
            <button type="button" onClick={onWithdraw} className="btn btn-primary btn-sm min-w-0 flex-col gap-1 px-1 py-2 text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"><ArrowUpFromLine className="h-4 w-4 shrink-0" /><span className="min-w-0">Reprendre</span></button>
            <button type="button" onClick={onTransfer} className="btn btn-primary btn-sm min-w-0 flex-col gap-1 px-1 py-2 text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"><ArrowLeftRight className="h-4 w-4 shrink-0" /><span className="min-w-0">Transférer</span></button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
