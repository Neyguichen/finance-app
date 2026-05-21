import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, ExternalLink } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import { StatutBadge } from './StatutBadge'
import type { RemboursementAlsh } from '@/lib/types'

type Props = {
  item: RemboursementAlsh
  onEdit: (item: RemboursementAlsh) => void
  onDelete: (id: string) => void
}

export default function RemboursementCard({ item, onEdit, onDelete }: Props) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <StatutBadge statut={item.statut} />
            <p className="text-sm text-slate-300 mt-1">
              📅 {formatDate(item.periode_debut)} → {formatDate(item.periode_fin)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {item.montant != null && (
              <span className="font-bold text-white mr-2">{formatEuro(Number(item.montant))}</span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
              onClick={() => onEdit(item)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
              onClick={() => { if (confirm('Supprimer ?')) onDelete(item.id) }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          {item.date_paiement && <p>💳 Payé le {formatDate(item.date_paiement)}</p>}
          {item.date_partage_audrey && <p>📤 Partagé à Audrey le {formatDate(item.date_partage_audrey)}</p>}
          {item.note && <p className="text-slate-400 italic">{item.note}</p>}
        </div>

        {item.lien_facture && (
          <a href={item.lien_facture} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
            <ExternalLink className="w-3 h-3" /> Voir la facture
          </a>
        )}
      </CardContent>
    </Card>
  )
}