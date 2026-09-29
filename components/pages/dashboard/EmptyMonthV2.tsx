'use client'

import { CalendarPlus, Copy, Repeat2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = { month: string; onPrepare: (mode: 'previous' | 'habits' | 'empty') => void; loading?: boolean }

export default function EmptyMonthV2({ month, onPrepare, loading = false }: Props) {
  const normalizedMonth = month.slice(0, 7)
  const label = new Date(`${normalizedMonth}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const optionClassName = 'group h-auto min-h-20 items-start justify-start py-4 text-left hover:!border-slate-600 hover:!bg-slate-800 hover:!text-white'
  const helpClassName = 'mt-0.5 block text-xs font-normal text-slate-400 group-hover:text-slate-300'

  return <Card className="border-dashed border-slate-700 bg-slate-950/60"><CardContent className="p-5 space-y-4">
    <div><p className="text-xs uppercase tracking-wide text-slate-500">Mois non préparé</p><h2 className="text-lg font-semibold capitalize mt-1">{label}</h2><p className="text-sm text-slate-400 mt-1">Consulter ce mois ne crée rien. Choisis comment le préparer lorsque tu es prêt.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Button variant="outline" className={optionClassName} disabled={loading} onClick={() => onPrepare('previous')}><Copy className="w-4 h-4 mr-2 mt-0.5 shrink-0" /><span><strong className="block">Mois précédent</strong><span className={helpClassName}>Copier les revenus prévus, charges fixes et budgets variables du dernier mois préparé</span></span></Button>
      <Button variant="outline" className={optionClassName} disabled={loading} onClick={() => onPrepare('habits')}><Repeat2 className="w-4 h-4 mr-2 mt-0.5 shrink-0" /><span><strong className="block">Mes récurrences</strong><span className={helpClassName}>Créer le mois à partir de mes revenus, charges, épargne et budgets récurrents actifs</span></span></Button>
      <Button variant="outline" className={optionClassName} disabled={loading} onClick={() => onPrepare('empty')}><CalendarPlus className="w-4 h-4 mr-2 mt-0.5 shrink-0" /><span><strong className="block">Commencer de zéro</strong><span className={helpClassName}>Créer un mois vide, sans reprise automatique</span></span></Button>
    </div>
    <p className="text-xs text-slate-500">Un aperçu avec sélection sera affiché avant toute copie d&apos;opérations ou de budgets.</p>
  </CardContent></Card>
}
