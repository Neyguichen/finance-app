'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Info } from 'lucide-react'
import { formatEuro, pct } from '@/lib/utils'

type Props = {
  budgetDisponible: number
  totalPrevu: number
  totalReel: number
  resteM1Value: number
  totalRevenusVar: number
  totalReprisesVar: number
  totalChargesVar: number
  totalEpargneVar: number
}

export default function VariablesResume({
  budgetDisponible, totalPrevu, totalReel,
  resteM1Value, totalRevenusVar, totalReprisesVar, totalChargesVar, totalEpargneVar,
}: Props) {
  const [showBudgetInfo, setShowBudgetInfo] = useState(false)

  return (
    <Card className="bg-pink-950 border-pink-800">
      <CardContent className="p-4 space-y-2">
        {/* Budget disponible */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-pink-300">Budget disponible</span>
            <button onClick={() => setShowBudgetInfo(!showBudgetInfo)} className="text-slate-500 hover:text-slate-300">
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className={`font-bold ${budgetDisponible >= 0 ? 'text-pink-300' : 'text-red-400'}`}>
            {formatEuro(budgetDisponible)}
          </span>
        </div>
        {showBudgetInfo && (
          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2 space-y-0.5">
            {resteM1Value !== 0 && <p>Reste M-1 : {formatEuro(resteM1Value)}</p>}
            <p>Revenus : {formatEuro(totalRevenusVar)}</p>
            {totalReprisesVar > 0 && <p>Reprises épargne : +{formatEuro(totalReprisesVar)}</p>}
            <p>Charges fixes : −{formatEuro(totalChargesVar)}</p>
            {totalEpargneVar > 0 && <p>Épargne : −{formatEuro(totalEpargneVar)}</p>}
            <p className="border-t border-slate-700 pt-1 font-semibold">= {formatEuro(budgetDisponible)} à répartir en budgets variables</p>
          </div>
        )}
        <div className="border-t border-pink-900 pt-2" />
        {/* Budget prévu */}
        <div className="flex justify-between">
          <span className="font-semibold">Budget prévu</span>
          <span className="font-bold">{formatEuro(totalPrevu)}</span>
        </div>
        {totalPrevu > budgetDisponible && budgetDisponible > 0 && (
          <p className="text-xs text-amber-400">⚠️ Budget prévu supérieur au disponible ({formatEuro(totalPrevu - budgetDisponible)} de dépassement)</p>
        )}
        <div className="flex justify-between text-sm">
          <span>Dépensé réel</span>
          <span>{formatEuro(totalReel)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Reste</span>
          <span className={totalPrevu - totalReel >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {formatEuro(totalPrevu - totalReel)}
          </span>
        </div>
        <Progress value={totalPrevu > 0 ? pct(totalReel, totalPrevu) : 0} className="h-2" />
      </CardContent>
    </Card>
  )
}