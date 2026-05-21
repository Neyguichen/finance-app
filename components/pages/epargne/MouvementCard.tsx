import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatEuro } from '@/lib/utils'

type Props = {
  mvt: any
  readOnly: boolean
  getEnvNom: (id: string | null) => string
  onEdit: (mvt: { id: string; montant: number; note: string | null; recurrentId: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; note: string | null }) => void
}

export default function MouvementCard({ mvt, readOnly, getEnvNom, onEdit, onDelete }: Props) {
  const typeConfig = {
    epargne: { badge: 'bg-teal-900 text-teal-400', label: '↓ Épargner', color: 'text-teal-400' },
    reprise: { badge: 'bg-orange-900 text-orange-400', label: '↑ Reprendre', color: 'text-orange-400' },
    transfert: { badge: 'bg-blue-900 text-blue-400', label: '↔ Transfert', color: 'text-blue-400' },
  }[mvt.type] || { badge: 'bg-slate-800 text-slate-400', label: mvt.type, color: 'text-slate-400' }

  const direction =
    mvt.type === 'epargne' ? `→ ${getEnvNom(mvt.enveloppe_dest_id)}` :
    mvt.type === 'reprise' ? `← ${getEnvNom(mvt.enveloppe_source_id)}` :
    `${getEnvNom(mvt.enveloppe_source_id)} → ${getEnvNom(mvt.enveloppe_dest_id)}`

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="flex items-center justify-between p-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.badge}`}>{typeConfig.label}</span>
            {mvt.recurrent_id && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">{direction}</p>
          {mvt.note && <p className="text-xs text-slate-500">{mvt.note}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${typeConfig.color}`}>{formatEuro(Number(mvt.montant))}</span>
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onEdit({ id: mvt.id, montant: Number(mvt.montant), note: mvt.note, recurrentId: mvt.recurrent_id })}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                onClick={() => onDelete({ id: mvt.id, recurrentId: mvt.recurrent_id, note: mvt.note })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}