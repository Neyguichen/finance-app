import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ReceiptText } from 'lucide-react'
import { formatEuro, formatDate } from '@/lib/utils'

type Props = {
  tx: any
  readOnly: boolean
  getMontantNet: (tx: any) => number
  onEdit: (tx: any) => void
  onRemb: (tx: any) => void
  onDelete: (tx: any) => void
}

export default function DepenseCard({ tx, readOnly, getMontantNet, onEdit, onRemb, onDelete }: Props) {
  const net = getMontantNet(tx)
  const hasRemb = tx.remboursements?.length > 0

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>{tx.categorie?.icone || '📦'}</span>
            <div>
              <p className="text-sm font-medium">{tx.categorie?.nom || 'Sans catégorie'}</p>
              {tx.infos && <p className="text-xs text-slate-500">{tx.infos}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-bold text-pink-400">{formatEuro(net)}</p>
              {hasRemb && (
                <p className="text-xs text-emerald-400 line-through">{formatEuro(Number(tx.montant))}</p>
              )}
              <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
            </div>
            {!readOnly && (
              <>
                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onEdit(tx)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onRemb(tx)}>
                  <ReceiptText className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onDelete(tx)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}