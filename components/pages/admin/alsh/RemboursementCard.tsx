import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, ExternalLink, HandCoins } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import { StatutBadge } from './StatutBadge'
import type { RemboursementAlsh } from '@/lib/types'

type Props = {
  item: RemboursementAlsh
  remaining: number | null
  onEdit: (item: RemboursementAlsh) => void
  onDelete: () => void
}

export default function RemboursementCard({ item, remaining, onEdit, onDelete }: Props) {
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
              onClick={() => { if (confirm('Supprimer ce suivi ALSH ? La créance liée sera archivée.')) onDelete() }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          {item.date_paiement && <p>💳 Payé le {formatDate(item.date_paiement)}</p>}
          {item.date_partage_audrey && <p>📤 Partagé à Audrey le {formatDate(item.date_partage_audrey)}</p>}
          {item.note && <p className="text-slate-400 italic">{item.note}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/70 pt-2">
          {item.dette_id ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                <HandCoins className="h-3.5 w-3.5" />
                Créance liée{remaining != null ? ' · ' + formatEuro(remaining) + ' restant' : ''}
              </span>
              <Link href={'/epargne?view=debts&debtTab=jai_prete&selectedDebt=' + item.dette_id} className="text-xs text-indigo-300 hover:text-indigo-200">
                Gérer la créance →
              </Link>
            </>
          ) : (
            <span className="text-[11px] text-slate-600">La créance sera créée dès qu’un montant sera renseigné.</span>
          )}

          {item.lien_facture && (
            <a href={item.lien_facture} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
              <ExternalLink className="w-3 h-3" /> Voir la facture
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}