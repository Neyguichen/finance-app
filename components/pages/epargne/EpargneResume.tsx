import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  totalDisponible: number
  totalEpargne: number
  totalReprise: number
}

export default function EpargneResume({ totalDisponible, totalEpargne, totalReprise }: Props) {
  return (
    <Card className="bg-teal-950 border-teal-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-emerald-400">💰 Total disponible</span>
          <span className="font-bold text-xl text-emerald-400">{formatEuro(totalDisponible)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Épargné ce mois</span>
          <span className="font-bold text-teal-400">{formatEuro(totalEpargne)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Repris ce mois</span>
          <span className="font-bold text-orange-400">{formatEuro(totalReprise)}</span>
        </div>
      </CardContent>
    </Card>
  )
}