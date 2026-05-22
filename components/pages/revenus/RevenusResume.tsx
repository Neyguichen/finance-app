import { Card, CardContent } from '@/components/ui/card'
import { formatEuro, pct } from '@/lib/utils'

type Props = {
  totalEntrants: number
  totalActif: number
  totalPassif: number
  totalReprises: number
}

export default function RevenusResume({ totalEntrants, totalActif, totalPassif, totalReprises }: Props) {
  return (
    <Card className="bg-blue-950 border-blue-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Total Entrants</span>
          <span className="font-bold text-lg">{formatEuro(totalEntrants)}</span>
        </div>
        {totalActif > 0 && (
          <div className="flex justify-between text-sm text-slate-400">
            <span>Actif</span>
            <span>{formatEuro(totalActif)} ({pct(totalActif, totalEntrants)}%)</span>
          </div>
        )}
        {totalPassif > 0 && (
          <div className="flex justify-between text-sm text-slate-400">
            <span>Passif</span>
            <span>{formatEuro(totalPassif)} ({pct(totalPassif, totalEntrants)}%)</span>
          </div>
        )}
        {totalReprises > 0 && (
          <div className="flex justify-between text-sm text-slate-400">
            <span>Reprises épargne</span>
            <span>{formatEuro(totalReprises)} ({pct(totalReprises, totalEntrants)}%)</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}