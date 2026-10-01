'use client'

import { CalendarDays, CircleDollarSign, Info, RotateCcw, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  plannedIncome: number
  receivedIncome: number
  expectedIncome: number
  totalActif: number
  totalPassif: number
  carriedBalance: number | null | undefined
}

export default function RevenusResume({
  plannedIncome,
  receivedIncome,
  expectedIncome,
  totalActif,
  totalPassif,
  carriedBalance,
}: Props) {
  const [showCarryHelp, setShowCarryHelp] = useState(false)
  const receivedRate = plannedIncome > 0 ? Math.round((receivedIncome / plannedIncome) * 100) : 0

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="nf-card-hover border-blue-400/25 bg-blue-500/[0.07]">
        <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-300">Revenus prévus</p>
            <p className="mt-1.5 text-2xl font-bold text-blue-300">{formatEuro(plannedIncome)}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">Actifs {formatEuro(totalActif)} · Passifs {formatEuro(totalPassif)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="nf-card-hover border-emerald-400/25 bg-emerald-500/[0.07]">
        <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <WalletCards className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-300">Revenus reçus</p>
            <p className="mt-1.5 text-2xl font-bold text-emerald-300">{formatEuro(receivedIncome)}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">{receivedRate}% du montant prévu.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="nf-card-hover border-amber-400/25 bg-amber-500/[0.07]">
        <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-300">Encore attendus</p>
            <p className="mt-1.5 text-2xl font-bold text-amber-300">{formatEuro(expectedIncome)}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">Reste à recevoir ce mois-ci.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="nf-card-hover border-cyan-400/20 bg-cyan-500/[0.05]">
        <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div className="relative min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-cyan-300">Solde reporté</p>
              <button type="button" onClick={() => setShowCarryHelp(value => !value)} className="text-cyan-300/70" aria-label="À propos du solde reporté"><Info className="h-3.5 w-3.5" /></button>
              {showCarryHelp && <div className="absolute right-0 top-6 z-30 w-64 rounded-xl border border-slate-700 bg-slate-950 p-3 text-[11px] leading-4 text-slate-300 shadow-2xl">Solde disponible à la fin du mois précédent. Il participe à votre trésorerie du mois, mais n’est pas comptabilisé comme un revenu.</div>}
            </div>
            <p className="mt-1.5 text-2xl font-bold text-cyan-300">{carriedBalance == null ? '—' : formatEuro(carriedBalance)}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">Pris en compte dans votre disponible, hors revenus.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
