import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  totalDisponible: number
  totalPrevus: number
  totalEpargne: number
  totalReprise: number
}

export default function EpargneResume({ totalDisponible, totalPrevus, totalEpargne, totalReprise }: Props) {
  const ecart = totalEpargne - totalPrevus

  return (
    <Card className="nf-glow border-emerald-400/15">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <span className="text-sm font-semibold text-emerald-400">Total disponible</span>
          <span className="text-2xl font-bold text-emerald-400 sm:text-3xl">{formatEuro(totalDisponible)}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-4 text-sm sm:grid-cols-2 sm:gap-4">
          <div>
            <p className="text-slate-500 text-xs">Prévu ce mois</p>
            <p className="font-bold text-sky-400">{formatEuro(totalPrevus)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-slate-500 text-xs">Réel épargné</p>
            <p className="font-bold text-teal-400">{formatEuro(totalEpargne)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Écart au prévu</p>
            <p className={`font-bold ${ecart >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {ecart > 0 ? '+' : ''}{formatEuro(ecart)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-slate-500 text-xs">Repris ce mois</p>
            <p className="font-bold text-orange-400">{formatEuro(totalReprise)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
