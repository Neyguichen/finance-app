import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ReceiptText, Scissors, ChevronDown, ChevronRight, X } from 'lucide-react'
import { formatEuro, formatDate } from '@/lib/utils'

type Props = {
  tx: any
  readOnly: boolean
  doubleDate?: boolean
  getMontantNet: (tx: any) => number
  onEdit: (tx: any) => void
  onRemb: (tx: any) => void
  onDelete: (tx: any) => void
  onSplit?: (tx: any) => void
  onUnsplit?: (tx: any) => void
}

export default function DepenseCard({ tx, readOnly, doubleDate, getMontantNet, onEdit, onRemb, onDelete, onSplit, onUnsplit }: Props) {
  const [expanded, setExpanded] = useState(false)
  const net = getMontantNet(tx)
  const hasRemb = tx.remboursements?.length > 0
  const isAwaitingValidation = doubleDate && !tx.date_validation
  const isSplit = tx.is_split && tx.children?.length > 0

  return (
    <div>
      <Card className={`border-slate-800 ${isAwaitingValidation ? 'bg-amber-950/40 border-amber-800/50' : isSplit ? 'bg-indigo-950/30 border-indigo-800/50' : 'bg-slate-900'}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Toggle expand pour split */}
              {isSplit ? (
                <button type="button" onClick={() => setExpanded(!expanded)} className="text-indigo-400 hover:text-indigo-200 flex-shrink-0">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="flex-shrink-0">{tx.categorie?.icone || '📦'}</span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isSplit && <span className="flex-shrink-0">{tx.categorie?.icone || '📦'}</span>}
                  <p className="text-sm font-medium truncate">{tx.categorie?.nom || 'Sans catégorie'}</p>
                  {isAwaitingValidation && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900 text-amber-400 flex-shrink-0">⏳ À valider</span>
                  )}
                  {isSplit && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-900 text-indigo-400 flex-shrink-0">✂️ Split ({tx.children.length})</span>
                  )}
                </div>
                {tx.sous_categorie && (
                  <p className="text-xs text-slate-400">{tx.sous_categorie.icone} {tx.sous_categorie.nom}</p>
                )}
                {tx.infos && <p className="text-xs text-slate-500 truncate">{tx.infos}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
                <div className="flex flex-col gap-0.5">
                  {/* Éditer (seulement si pas splitté) */}
                  {!isSplit && (
                    <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onEdit(tx)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                  {/* Split / Re-split */}
                  {onSplit && (
                    <Button variant="ghost" size="icon" className="text-indigo-400 h-7 w-7" onClick={() => onSplit(tx)}>
                      <Scissors className="w-3 h-3" />
                    </Button>
                  )}
                  {/* Unsplit */}
                  {isSplit && onUnsplit && (
                    <Button variant="ghost" size="icon" className="text-amber-400 h-7 w-7" onClick={() => onUnsplit(tx)}
                      title="Annuler le split">
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {/* Remboursement (seulement si pas splitté — on rembourse les enfants) */}
                  {!isSplit && (
                    <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onRemb(tx)}>
                      <ReceiptText className="w-3 h-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7" onClick={() => onDelete(tx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enfants du split (indentés) */}
      {isSplit && expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-800/30 pl-2">
          {tx.children.map((child: any) => {
            const childNet = getMontantNet(child)
            const childHasRemb = child.remboursements?.length > 0
            return (
              <Card key={child.id} className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{child.categorie?.icone || '📦'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{child.categorie?.nom || 'Sans catégorie'}</p>
                        {child.sous_categorie && (
                          <p className="text-[10px] text-slate-400">{child.sous_categorie.icone} {child.sous_categorie.nom}</p>
                        )}
                        {child.infos && <p className="text-[10px] text-slate-500 truncate">{child.infos}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-pink-400">{formatEuro(childNet)}</p>
                        {childHasRemb && (
                          <p className="text-[10px] text-emerald-400 line-through">{formatEuro(Number(child.montant))}</p>
                        )}
                      </div>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" className="text-slate-500 h-6 w-6" onClick={() => onRemb(child)}>
                          <ReceiptText className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}