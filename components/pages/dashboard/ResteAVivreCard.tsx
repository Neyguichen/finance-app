'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'
import { formatEuro } from '@/lib/utils'

interface Props {
  restePrevu: number
  resteReel: number
}

export default function ResteAVivreCard({ restePrevu, resteReel }: Props) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <Card className="bg-blue-950 border-blue-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-blue-400">Reste à vivre</h2>
          <button type="button" onClick={() => setShowInfo(!showInfo)} className="text-blue-600 hover:text-blue-400">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        {showInfo && (
          <div className="text-xs text-blue-300/70 bg-blue-900/50 rounded-lg p-2 space-y-1">
            <p><strong>Prévu</strong> : Entrants − Charges fixes (cochées ou non) − Charges Variables dépensées / budgétisées − Épargne. C&apos;est ce qu&apos;il vous restera si vous respectez vos budgets.</p>
            <p><strong>Réel</strong> : Entrants reçus − Charges payées − Dépenses réelles − Épargne. C&apos;est ce qu&apos;il vous reste vraiment aujourd&apos;hui.</p>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Prévu</span>
          <span className={restePrevu >= 0 ? 'font-bold text-blue-300' : 'font-bold text-red-400'}>
            {formatEuro(restePrevu)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Réel</span>
          <span className={resteReel >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
            {formatEuro(resteReel)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}