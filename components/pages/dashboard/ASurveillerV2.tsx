'use client'

import { AlertTriangle, CheckCircle2, Clock3, PiggyBank, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type BudgetProgress = { id: string; name: string; icon: string; planned: number; actual: number; remaining: number }
type Props = { budgetProgress: BudgetProgress[]; expectedIncome: number; plannedSavings: number; actualSavings: number; today: string; selectedMonth: string }

export default function ASurveillerV2({ budgetProgress, expectedIncome, plannedSavings, actualSavings, today, selectedMonth }: Props) {
  const isCurrent = selectedMonth.slice(0, 7) === today.slice(0, 7)
  const [y, m] = selectedMonth.split('-').map(Number)
  const end = new Date(y, m, 0, 12)
  const now = new Date(today + 'T12:00:00')
  const daysRemaining = isCurrent ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)) : 0
  const risky = budgetProgress.filter(b => b.planned > 0 && b.actual / b.planned >= .8).sort((a, b) => (b.actual / b.planned) - (a.actual / a.planned))

  const alerts: Array<{ icon: any; title: string; detail: string; tone: string }> = []
  risky.slice(0, 2).forEach(b => {
    const pct = Math.round((b.actual / b.planned) * 100)
    alerts.push({ icon: WalletCards, title: `${b.icon} ${b.name}`, detail: b.remaining < 0 ? `${formatEuro(Math.abs(b.remaining))} au-dessus du budget` : `${pct}% du budget utilisé`, tone: b.remaining < 0 ? 'rose' : 'amber' })
  })
  if (isCurrent && daysRemaining <= 7 && expectedIncome > 0) alerts.push({ icon: Clock3, title: 'Revenus encore attendus', detail: `${formatEuro(expectedIncome)} à recevoir avant la fin du mois`, tone: 'blue' })
  if (isCurrent && daysRemaining <= 7 && plannedSavings > actualSavings) alerts.push({ icon: PiggyBank, title: 'Objectif d’épargne du mois', detail: `${formatEuro(plannedSavings - actualSavings)} restent à verser`, tone: 'amber' })
  if (alerts.length === 0) alerts.push({ icon: CheckCircle2, title: 'Rien de critique à signaler', detail: 'Les principaux indicateurs du mois restent dans leurs zones prévues.', tone: 'emerald' })

  const toneClass: Record<string, string> = { rose: 'border-rose-400/15 bg-rose-500/[0.06] text-rose-300', amber: 'border-amber-400/15 bg-amber-500/[0.06] text-amber-300', blue: 'border-blue-400/15 bg-blue-500/[0.06] text-blue-300', emerald: 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300' }
  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-slate-100">À surveiller <AlertTriangle className="h-4 w-4 text-slate-500" /></CardTitle></CardHeader>
      <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3">
        {alerts.slice(0, 3).map((alert, i) => { const Icon = alert.icon; return <div key={`${alert.title}-${i}`} className={`rounded-xl border p-3 ${toneClass[alert.tone]}`}><div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-semibold text-slate-200">{alert.title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{alert.detail}</p></div></div></div> })}
      </CardContent>
    </Card>
  )
}
