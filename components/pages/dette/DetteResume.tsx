import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  totalJeDois: number
  totalJaiPrete: number
}

export default function DetteResume({ totalJeDois, totalJaiPrete }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-red-950 border-red-800">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-red-400">Je dois</p>
          <p className="text-lg font-bold text-red-300">{formatEuro(totalJeDois)}</p>
        </CardContent>
      </Card>
      <Card className="bg-emerald-950 border-emerald-800">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-emerald-400">On me doit</p>
          <p className="text-lg font-bold text-emerald-300">{formatEuro(totalJaiPrete)}</p>
        </CardContent>
      </Card>
    </div>
  )
}