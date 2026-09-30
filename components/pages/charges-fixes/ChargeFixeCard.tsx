import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatEuro, formatDate, localDateISO } from '@/lib/utils'

type Props = {
  charge: any
  readOnly: boolean
  doubleDate?: boolean
  onTogglePayee: (id: string, payee: boolean, dateReelle?: string | null) => void
  onActualAmountChange?: (id: string, montantReel: number | null) => void
  onEdit: (charge: { id: string; nom: string; montant: number; recurrentId: string | null; categorieId?: string | null; sousCategorieId?: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; nom: string }) => void
}

export default function ChargeFixeCard({ charge, readOnly, doubleDate = false, onTogglePayee, onActualAmountChange, onEdit, onDelete }: Props) {
  const today = localDateISO()
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:items-center">
          <Checkbox
            checked={charge.payee}
            onCheckedChange={(checked) => {
              if (readOnly) return
              onTogglePayee(charge.id, !!checked, checked ? (doubleDate ? null : today) : undefined)
            }}
          />
          <div>
            <p className={charge.payee ? 'line-through text-slate-500' : 'font-medium'}>
              {charge.nom}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {charge.recurrent_id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">↻ Récurrente</span>
              )}
              {charge.categorie_nom && (
                <span className="text-[11px] text-slate-500">
                  {charge.categorie_icone || '📂'} {charge.categorie_nom}{charge.sous_categorie_nom ? ` · ${charge.sous_categorie_nom}` : ''}
                </span>
              )}
            </div>
            {(charge.date_prevue || (doubleDate && charge.date_reelle)) && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <CalendarDays className="h-3 w-3" />
                {charge.date_prevue && <span>Prévu {formatDate(charge.date_prevue)}</span>}
                {doubleDate && charge.date_reelle && <span className="text-indigo-300">Payé {formatDate(charge.date_reelle)}</span>}
              </div>
            )}
            {!readOnly && charge.payee && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {doubleDate && (
                  <>
                    <span className="text-[11px] text-slate-500">Date payée</span>
                    <Input
                      type="date"
                      value={charge.date_reelle || ''}
                      className="h-7 w-36 text-xs"
                      onChange={e => onTogglePayee(charge.id, true, e.target.value || null)}
                    />
                  </>
                )}
                {onActualAmountChange && (
                  <>
                    <span className="text-[11px] text-slate-500">Montant payé</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={charge.montant_reel ?? charge.montant}
                      className="h-7 w-28 text-xs"
                      onChange={e => onActualAmountChange(charge.id, e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:gap-2">
          <div className="text-right"><span className="font-bold text-purple-400">{formatEuro(Number(charge.payee ? (charge.montant_reel ?? charge.montant) : charge.montant))}</span>{charge.payee && charge.montant_reel != null && Number(charge.montant_reel) !== Number(charge.montant) && <p className="text-[10px] text-slate-500">prévu {formatEuro(Number(charge.montant))}</p>}</div>
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onEdit({ id: charge.id, nom: charge.nom, montant: Number(charge.montant), recurrentId: charge.recurrent_id, categorieId: charge.categorie_id ?? null, sousCategorieId: charge.sous_categorie_id ?? null })}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onDelete({ id: charge.id, recurrentId: charge.recurrent_id, nom: charge.nom })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}