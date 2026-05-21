import { Card, CardContent } from '@/components/ui/card'
import { STATUTS } from './StatutBadge'
import { formatEuro } from '@/lib/utils'
import type { RemboursementAlsh } from '@/lib/types'

type Props = {
  items: RemboursementAlsh[]
}

export default function RemboursementResume({ items }: Props) {
  const countByStatut = (s: string) => items.filter(i => i.statut === s).length
  const totalMontant = items.reduce((s, i) => s + (Number(i.montant) || 0), 0)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-3 flex flex-wrap gap-3 text-xs">
        {STATUTS.map(s => (
          <span key={s.value} className={`px-2 py-1 rounded-full ${s.color}`}>
            {s.label}: {countByStatut(s.value)}
          </span>
        ))}
        {totalMontant > 0 && (
          <span className="ml-auto text-slate-300 font-semibold">
            Total: {formatEuro(totalMontant)}
          </span>
        )}
      </CardContent>
    </Card>
  )
}