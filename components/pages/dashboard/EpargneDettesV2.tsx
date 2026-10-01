'use client'

import Link from 'next/link'
import { ArrowRight, HandCoins, PiggyBank } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  savingsAvailable: number
  plannedSavings: number
  actualSavings: number
  savingsWithdrawals: number
  debtRemaining: number
  receivableRemaining: number
  debtRepaymentsIn?: number
  debtRepaymentsOut?: number
  loading?: boolean
}

export default function EpargneDettesV2({
  savingsAvailable,
  plannedSavings,
  actualSavings,
  savingsWithdrawals,
  debtRemaining,
  receivableRemaining,
  debtRepaymentsIn = 0,
  debtRepaymentsOut = 0,
  loading,
}: Props) {
  const savingsProgress = plannedSavings > 0 ? Math.min(100, Math.round((actualSavings / plannedSavings) * 100)) : 0

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-slate-100">
          <span>Épargne & Dettes</span>
          <Link href="/epargne" className="inline-flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-indigo-300">
            Voir le détail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center"><span className="loading loading-spinner loading-sm" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-sky-400/10 bg-sky-500/[0.04] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-sky-300"><PiggyBank className="h-4 w-4" />Épargne</div>
              <p className="mt-1 text-xl font-bold text-sky-300">{formatEuro(savingsAvailable)}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                <span><span className="text-emerald-400">+{formatEuro(actualSavings)}</span> versés ce mois</span>
                {savingsWithdrawals > 0 && <span><span className="text-rose-400">−{formatEuro(savingsWithdrawals)}</span> repris</span>}
              </div>
              {plannedSavings > 0 && (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400" style={{ width: String(savingsProgress) + '%' }} /></div>
                  <p className="mt-1 text-[10px] text-slate-600">{savingsProgress}% de l’épargne prévue du mois</p>
                </>
              )}
            </div>

            <div className="rounded-xl border border-orange-400/10 bg-orange-500/[0.035] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-orange-300"><HandCoins className="h-4 w-4" />Dettes & créances</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-slate-500">Je dois</p><p className="text-base font-bold text-orange-400">{formatEuro(debtRemaining)}</p></div>
                <div><p className="text-[10px] text-slate-500">On me doit</p><p className="text-base font-bold text-emerald-400">{formatEuro(receivableRemaining)}</p></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-800/70 pt-2 text-[10px] text-slate-500">
                <div>Remboursé ce mois<br/><span className="font-semibold text-orange-300">{formatEuro(debtRepaymentsOut)}</span></div>
                <div>Récupéré ce mois<br/><span className="font-semibold text-emerald-300">{formatEuro(debtRepaymentsIn)}</span></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
