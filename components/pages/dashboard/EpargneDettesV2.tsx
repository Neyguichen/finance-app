'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  savingsAvailable: number
  plannedSavings: number
  actualSavings: number
  savingsWithdrawals: number
  debtRemaining: number
  receivableRemaining: number
  loading?: boolean
}

export default function EpargneDettesV2({
  savingsAvailable,
  plannedSavings,
  actualSavings,
  savingsWithdrawals,
  debtRemaining,
  receivableRemaining,
  loading,
}: Props) {
  if (loading) {
    return <Card className="nf-card-hover"><CardContent className="p-4"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="nf-eyebrow">Épargne & dettes</p>
        <h2 className="text-lg font-semibold">Mes réserves et engagements</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="nf-card-hover">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-slate-400">Épargne disponible</p>
            <p className="text-xl font-bold text-sky-300">{formatEuro(savingsAvailable)}</p>
            <p className="text-[11px] text-slate-500">Ce mois : {formatEuro(actualSavings)} versés sur {formatEuro(plannedSavings)} prévus · {formatEuro(savingsWithdrawals)} repris.</p>
            <Link href="/epargne" className="inline-block text-xs text-indigo-300 hover:text-indigo-200">Voir l’épargne →</Link>
          </CardContent>
        </Card>

        <Card className="nf-card-hover">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-slate-400">Je dois encore</p>
            <p className="text-xl font-bold text-orange-400">{formatEuro(debtRemaining)}</p>
            <p className="text-[11px] text-slate-500">Reste des dettes actives après remboursements enregistrés.</p>
            <Link href="/dette" className="inline-block text-xs text-indigo-300 hover:text-indigo-200">Voir les dettes →</Link>
          </CardContent>
        </Card>

        <Card className="nf-card-hover">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-slate-400">On me doit encore</p>
            <p className="text-xl font-bold text-emerald-400">{formatEuro(receivableRemaining)}</p>
            <p className="text-[11px] text-slate-500">Reste des créances actives, sans les assimiler à des revenus.</p>
            <Link href="/dette" className="inline-block text-xs text-indigo-300 hover:text-indigo-200">Voir les créances →</Link>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
