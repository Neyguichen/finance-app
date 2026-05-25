'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { formatEuro, pct } from '@/lib/utils'

type SubCatBudget = {
  id: string
  nom: string
  icone: string | null
  prevu: number
  depense: number
}

type Props = {
  cat: { id: string; nom: string; icone: string }
  prevu: number
  depense: number
  avgMois?: number
  inactive?: boolean
  readOnly: boolean
  subCats?: SubCatBudget[]
  onUpsertBudget: (catId: string, prevu: number) => void
  onArchive: (target: { id: string; nom: string }) => void
}

export default function BudgetCard({ cat, prevu, depense, avgMois, inactive, readOnly, subCats = [], onUpsertBudget, onArchive }: Props) {
  const hasSubCats = subCats.length > 0
  const [inputValue, setInputValue] = useState(prevu || '')
  const [expanded, setExpanded] = useState(false)
  const [subInputs, setSubInputs] = useState<Record<string, string>>({})

  const ratio = prevu > 0 ? pct(depense, prevu) : 0

  // Pour sous-catégories : le total prévu = somme des sous-cat prévus
  const totalPrevuSubCats = hasSubCats ? subCats.reduce((s, sc) => s + sc.prevu, 0) : prevu
  const effectivePrevu = hasSubCats ? totalPrevuSubCats : prevu
  const effectiveRatio = effectivePrevu > 0 ? pct(depense, effectivePrevu) : 0

  const getSubInput = (sc: SubCatBudget) => subInputs[sc.id] ?? (sc.prevu || '')

  return (
    <div className={`bg-slate-900${inactive ? '/50' : ''} border border-slate-800 rounded-xl p-3 space-y-1.5${inactive ? ' opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {hasSubCats && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
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
            <span className="text-slate-500"> / {formatEuro(effectivePrevu)}</span>
          </div>
          <div className="text-xs text-right">
            <span className="text-slate-500">Reste </span>
            <span className={effectivePrevu - depense >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {formatEuro(effectivePrevu - depense)}
            </span>
          </div>
        </>
      )}

      {avgMois !== undefined && (
        <div className="text-xs text-right text-slate-500">
          Moy. <span className="text-slate-400">{formatEuro(avgMois)}</span>/mois
        </div>
      )}

      {!inactive && <Progress value={Math.min(effectiveRatio, 100)} className="h-1" />}

      {/* Sans sous-catégories : input budget direct (comme avant) */}
      {!hasSubCats && !readOnly && (
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

      {/* Avec sous-catégories : détail expandable */}
      {hasSubCats && expanded && (
        <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
          {subCats.map(sc => {
            const scRatio = sc.prevu > 0 ? pct(sc.depense, sc.prevu) : 0
            return (
              <div key={sc.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 truncate">
                    {sc.icone || '📎'} {sc.nom}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatEuro(sc.depense)}
                    <span className="text-slate-600"> / {formatEuro(sc.prevu)}</span>
                  </span>
                </div>
                <Progress value={Math.min(scRatio, 100)} className="h-0.5" />
                {!readOnly && (
                  <div className="flex gap-1">
                    <Input
                      type="number" step="0.01"
                      className="h-5 text-[10px] bg-slate-800 border-slate-700 px-1.5 flex-1"
                      placeholder="Budget"
                      value={getSubInput(sc)}
                      onChange={e => setSubInputs(prev => ({ ...prev, [sc.id]: e.target.value }))}
                    />
                    <button
                      className="h-5 px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      onClick={() => onUpsertBudget(sc.id, parseFloat(String(getSubInput(sc))) || 0)}
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}