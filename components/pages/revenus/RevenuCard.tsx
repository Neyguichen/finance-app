import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2 } from 'lucide-react'
import { formatEuro } from '@/lib/utils'

type Props = {
  rev: { id: string; nom: string; montant: number; type: string; recu: boolean; recurrent_id?: string | null }
  readOnly: boolean
  onToggleRecu: (id: string, recu: boolean) => void
  onEdit: (rev: { id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; nom: string }) => void
}

export default function RevenuCard({ rev, readOnly, onToggleRecu, onEdit, onDelete }: Props) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={rev.recu}
            onCheckedChange={(checked) => {
              if (readOnly) return
              onToggleRecu(rev.id, !!checked)
            }}
          />
          <div>
            <p className="font-medium">{rev.nom}</p>
            <div className="flex items-center gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                rev.type === 'actif'
                  ? 'bg-emerald-900 text-emerald-400'
                  : 'bg-blue-900 text-blue-400'
              }`}>{rev.type}</span>
              {rev.recurrent_id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${Number(rev.montant) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatEuro(Number(rev.montant))}
          </span>
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onEdit({ id: rev.id, nom: rev.nom, montant: Number(rev.montant), type: rev.type as 'actif' | 'passif', recurrentId: rev.recurrent_id })}>
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