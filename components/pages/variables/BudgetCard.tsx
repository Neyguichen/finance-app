'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Trash2 } from 'lucide-react'
import { formatEuro, pct } from '@/lib/utils'

type Props = {
  cat: { id: string; nom: string; icone: string }
  prevu: number
  depense: number
  avgMois?: number
  inactive?: boolean
  readOnly: boolean
  onUpsertBudget: (catId: string, prevu: number) => void
  onArchive: (target: { id: string; nom: string }) => void
}

export default function BudgetCard({ cat, prevu, depense, avgMois, inactive, readOnly, onUpsertBudget, onArchive }: Props) {
  const [inputValue, setInputValue] = useState(prevu || '')
  const ratio = prevu > 0 ? pct(depense, prevu) : 0

  return (
    <div className={`bg-slate-900${inactive ? '/50' : ''} border border-slate-800 rounded-xl p-3 space-y-1.5${inactive ? ' opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base">{cat.icone}</span>
          <span className="text-xs font-medium truncate">{cat.nom}</span>
        </div>
        {!readOnly && (
          <Button variant="ghost" size="icon" className="text-slate-600 h-5 w-5 flex-shrink-0"
            onClick={() => onArchive({ id: cat.id, nom: cat.nom })}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      {!inactive && (
        <>
          <div className="text-xs text-right">
            {formatEuro(depense)}
            <span className="text-slate-500"> / {formatEuro(prevu)}</span>
          </div>
          <div className="text-xs text-right">
            <span className="text-slate-500">Reste </span>
            <span className={prevu - depense >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {formatEuro(prevu - depense)}
            </span>
          </div>
        </>
      )}
      {/* Moyenne annuelle */}
      {avgMois !== undefined && (
        <div className="text-xs text-right text-slate-500">
          Moy. <span className="text-slate-400">{formatEuro(avgMois)}</span>/mois
        </div>
      )}
      {!inactive && <Progress value={Math.min(ratio, 100)} className="h-1" />}
      {!readOnly && (
        <div className="flex gap-1">
          <Input
            type="number" step="0.01"
            className="h-6 text-xs bg-slate-800 border-slate-700 px-2 flex-1"
            placeholder="Budget"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <button
            className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            onClick={() => onUpsertBudget(cat.id, parseFloat(String(inputValue)) || 0)}
          >
            ✓
          </button>
        </div>
      )}
    </div>
  )
}