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
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Revenus prévus" value={plannedIncome} />
          <Metric label="Reçus" value={receivedIncome} valueClass="text-emerald-400" />
          <Metric label="Encore attendus" value={expectedIncome} />
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-slate-800/80 pt-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-400/10 bg-emerald-500/5 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300/70">Actifs prévus</p>
            <p className="shrink-0 text-base font-semibold tabular-nums text-slate-100">{formatEuro(totalActif)}</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-indigo-400/10 bg-indigo-500/5 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-indigo-300/70">Passifs prévus</p>
            <p className="shrink-0 text-base font-semibold tabular-nums text-slate-100">{formatEuro(totalPassif)}</p>
          </div>
        </div>

        {totalReprises > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-sm">
            <span className="text-slate-400">Reprises d’épargne <span className="text-xs text-slate-600">(hors revenus)</span></span>
            <span className="font-semibold">{formatEuro(totalReprises)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, valueClass = '' }: { label: string; value: number; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${valueClass}`}>{formatEuro(value)}</p>
    </div>
  )
}
