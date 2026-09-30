import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatEuro, formatDate, localDateISO } from '@/lib/utils'

type Props = {
  rev: { id: string; nom: string; montant: number; type: string; recu: boolean; recurrent_id?: string | null; date_prevue?: string | null; date_reelle?: string | null }
  readOnly: boolean
  doubleDate?: boolean
  onToggleRecu: (id: string, recu: boolean, dateReelle?: string | null) => void
  onEdit: (rev: { id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null; datePrevue?: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; nom: string }) => void
}

export default function RevenuCard({ rev, readOnly, doubleDate = false, onToggleRecu, onEdit, onDelete }: Props) {
  const today = localDateISO()
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:items-center">
          <Checkbox
            checked={rev.recu}
            onCheckedChange={(checked) => {
              if (readOnly) return
              onToggleRecu(rev.id, !!checked, checked ? (doubleDate ? null : today) : undefined)
            }}
          />
          <div>
            <p className="font-medium">{rev.nom}</p>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                rev.type === 'actif'
                  ? 'bg-emerald-900 text-emerald-400'
                  : 'bg-blue-900 text-blue-400'
              }`}>{rev.type}</span>
              {rev.recurrent_id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
              )}
            </div>
            {(rev.date_prevue || (doubleDate && rev.date_reelle)) && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <CalendarDays className="h-3 w-3" />
                {rev.date_prevue && <span>Prévu {formatDate(rev.date_prevue)}</span>}
                {doubleDate && rev.date_reelle && <span className="text-emerald-500">Reçu {formatDate(rev.date_reelle)}</span>}
              </div>
            )}
            {!readOnly && doubleDate && rev.recu && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Date reçue</span>
                <Input
                  type="date"
                  value={rev.date_reelle || ''}
                  className="h-7 w-36 text-xs"
                  onChange={e => onToggleRecu(rev.id, true, e.target.value || null)}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:gap-2">
          <span className={`font-bold ${Number(rev.montant) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatEuro(Number(rev.montant))}
          </span>
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onEdit({ id: rev.id, nom: rev.nom, montant: Number(rev.montant), type: rev.type as 'actif' | 'passif', recurrentId: rev.recurrent_id, datePrevue: rev.date_prevue })}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onDelete({ id: rev.id, recurrentId: rev.recurrent_id ?? null, nom: rev.nom })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}