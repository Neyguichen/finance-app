import { Card, CardContent } from '@/components/ui/card'
import { formatEuro, pct } from '@/lib/utils'

type Props = {
  total: number
  totalPayee: number
  aVenir: number
}

export default function ChargeFixeResume({ total, totalPayee, aVenir }: Props) {
  return (
    <Card className="bg-purple-950 border-purple-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">{formatEuro(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Payé ({pct(totalPayee, total)}%)</span>
          <span>{formatEuro(totalPayee)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-400">
          <span>À venir</span>
          <span>{formatEuro(aVenir)}</span>
        </div>
      </CardContent>
    </Card>
  )
}