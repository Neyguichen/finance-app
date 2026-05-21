import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2 } from 'lucide-react'
import { formatEuro } from '@/lib/utils'

type Props = {
  charge: any
  readOnly: boolean
  onTogglePayee: (id: string, payee: boolean) => void
  onEdit: (charge: { id: string; nom: string; montant: number; recurrentId: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; nom: string }) => void
}

export default function ChargeFixeCard({ charge, readOnly, onTogglePayee, onEdit, onDelete }: Props) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={charge.payee}
            onCheckedChange={(checked) => {
              if (readOnly) return
              onTogglePayee(charge.id, !!checked)
            }}
          />
          <div>
            <p className={charge.payee ? 'line-through text-slate-500' : 'font-medium'}>
              {charge.nom}
            </p>
            {charge.recurrent_id && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-purple-400">{formatEuro(Number(charge.montant))}</span>
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onEdit({ id: charge.id, nom: charge.nom, montant: Number(charge.montant), recurrentId: charge.recurrent_id })}>
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