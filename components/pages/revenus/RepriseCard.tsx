import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  reprise: { id: string; montant: number; note?: string | null; enveloppe_source_id?: string | null }
  getEnvNom: (id: string | null) => string
}

export default function RepriseCard({ reprise, getEnvNom }: Props) {
  const envNom = getEnvNom(reprise.enveloppe_source_id ?? null)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">📤</span>
          <div>
            <p className="font-medium">Reprise — {envNom}</p>
            {reprise.note && <p className="text-xs text-slate-500">{reprise.note}</p>}
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-400">reprise</span>
          </div>
        </div>
        <span className="font-bold text-emerald-400">
          {formatEuro(Number(reprise.montant))}
        </span>
      </CardContent>
    </Card>
  )
}