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
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-emerald-400">Total disponible</span>
          <span className="font-bold text-xl text-emerald-400">{formatEuro(totalDisponible)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-slate-800/80 pt-3">
          <div>
            <p className="text-slate-500 text-xs">Prévu ce mois</p>
            <p className="font-bold text-sky-400">{formatEuro(totalPrevus)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Réel épargné</p>
            <p className="font-bold text-teal-400">{formatEuro(totalEpargne)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Écart au prévu</p>
            <p className={`font-bold ${ecart >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {ecart > 0 ? '+' : ''}{formatEuro(ecart)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Repris ce mois</p>
            <p className="font-bold text-orange-400">{formatEuro(totalReprise)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
