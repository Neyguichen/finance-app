import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  plannedIncome: number
  receivedIncome: number
  expectedIncome: number
  totalActif: number
  totalPassif: number
  totalReprises: number
}

export default function RevenusResume({ plannedIncome, receivedIncome, expectedIncome, totalActif, totalPassif, totalReprises }: Props) {
  return (
    <Card className="nf-glow border-indigo-400/20">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div><p className="text-xs text-slate-400">Revenus prévus</p><p className="font-bold text-lg">{formatEuro(plannedIncome)}</p></div>
          <div><p className="text-xs text-slate-400">Reçus</p><p className="font-bold text-lg text-emerald-400">{formatEuro(receivedIncome)}</p></div>
          <div><p className="text-xs text-slate-400">Encore attendus</p><p className="font-bold text-lg">{formatEuro(expectedIncome)}</p></div>
        </div>
        <div className="border-t border-slate-800/80 pt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3"><span className="text-slate-400">Actifs prévus</span><span>{formatEuro(totalActif)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-slate-400">Passifs prévus</span><span>{formatEuro(totalPassif)}</span></div>
        </div>
        {totalReprises > 0 && (
          <div className="border-t border-slate-800/80 pt-2 flex justify-between gap-3 text-sm">
            <span className="text-slate-400">Reprises d’épargne <span className="text-xs">(hors revenus)</span></span>
            <span>{formatEuro(totalReprises)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
