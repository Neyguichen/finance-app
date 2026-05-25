import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ReceiptText } from 'lucide-react'
import { formatEuro, formatDate } from '@/lib/utils'

type Props = {
  tx: any
  readOnly: boolean
  doubleDate?: boolean
  getMontantNet: (tx: any) => number
  onEdit: (tx: any) => void
  onRemb: (tx: any) => void
  onDelete: (tx: any) => void
}

export default function DepenseCard({ tx, readOnly, doubleDate, getMontantNet, onEdit, onRemb, onDelete }: Props) {
  const net = getMontantNet(tx)
  const hasRemb = tx.remboursements?.length > 0
  const isAwaitingValidation = doubleDate && !tx.date_validation

  return (
    <Card className={`border-slate-800 ${isAwaitingValidation ? 'bg-amber-950/40 border-amber-800/50' : 'bg-slate-900'}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>{tx.categorie?.icone || '📦'}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{tx.categorie?.nom || 'Sans catégorie'}</p>
                {isAwaitingValidation && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900 text-amber-400">⏳ À valider</span>
                )}
              </div>
              {tx.infos && <p className="text-xs text-slate-500">{tx.infos}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-bold text-pink-400">{formatEuro(net)}</p>
              {hasRemb && (
                <p className="text-xs text-emerald-400 line-through">{formatEuro(Number(tx.montant))}</p>
              )}
              {doubleDate && tx.date_validation ? (
                <div>
                  <p className="text-xs text-slate-500">{formatDate(tx.date_validation)}</p>
                  <p className="text-[10px] text-slate-600">op. {formatDate(tx.date)}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
              )}
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