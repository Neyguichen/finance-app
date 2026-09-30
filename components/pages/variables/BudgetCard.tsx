'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(prevu || '')
  const [expanded, setExpanded] = useState(false)
  const [subInputs, setSubInputs] = useState<Record<string, string>>({})

  const ratio = prevu > 0 ? pct(depense, prevu) : 0
  const allocated = hasSubCats ? subCats.reduce((sum, item) => sum + item.prevu, 0) : 0
  const remaining = prevu - depense
  const getSubInput = (item: SubCatBudget) => subInputs[item.id] ?? (item.prevu || '')

  const saveParent = () => {
    onUpsertBudget(cat.id, parseFloat(String(inputValue)) || 0)
    setEditing(false)
  }

  return (
    <div className={`rounded-xl border border-slate-800/80 bg-slate-950/35 p-3 ${inactive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        {hasSubCats && (
          <button type="button" onClick={() => setExpanded(value => !value)} className="shrink-0 text-slate-600 hover:text-slate-300">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        <span className="text-base" aria-hidden="true">{cat.icone}</span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{cat.nom}</p>
        {!inactive && (
          <span className={`text-xs font-semibold ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {remaining < 0 ? '-' : ''}{formatEuro(Math.abs(remaining))}
          </span>
        )}
        {!readOnly && (
          <>
            <button type="button" onClick={() => setEditing(value => !value)} className="rounded-md p-1 text-slate-600 hover:text-indigo-300" aria-label="Modifier le budget">
              {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => onArchive({ id: cat.id, nom: cat.nom })} className="rounded-md p-1 text-slate-700 hover:text-rose-400" aria-label="Archiver la catégorie">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {!inactive && (
        <>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{formatEuro(depense)} dépensés</span>
            <span>{formatEuro(prevu)} prévus · {Math.round(ratio)}%</span>
          </div>
          <Progress value={Math.min(Math.max(ratio, 0), 100)} className="mt-1.5 h-1" />
        </>
      )}

      {avgMois !== undefined && <p className="mt-1 text-[10px] text-slate-600">Moyenne {formatEuro(avgMois)}/mois</p>}

      {editing && !readOnly && (
        <div className="mt-2 flex gap-2 border-t border-slate-800/70 pt-2">
          <Input
            type="number"
            step="0.01"
            className="h-8 flex-1 text-xs"
            value={inputValue}
            onChange={event => setInputValue(event.target.value)}
          />
          <Button size="sm" className="h-8 px-3" onClick={saveParent}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {hasSubCats && (
        <p className="mt-1 text-[10px] text-slate-600">Ventilé : {formatEuro(allocated)} / {formatEuro(prevu)}</p>
      )}

      {hasSubCats && expanded && (
        <div className="mt-2 space-y-2 border-t border-slate-800/70 pt-2">
          {subCats.map(item => {
            const subRatio = item.prevu > 0 ? pct(item.depense, item.prevu) : 0
            return (
              <div key={item.id} className="rounded-lg bg-slate-900/35 p-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-slate-400">{item.icone || '📎'} {item.nom}</span>
                  <span className="whitespace-nowrap text-slate-500">{formatEuro(item.depense)} / {formatEuro(item.prevu)}</span>
                </div>
                <Progress value={Math.min(Math.max(subRatio, 0), 100)} className="mt-1 h-0.5" />
                {!readOnly && (
                  <div className="mt-1.5 flex gap-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-7 flex-1 text-[11px]"
                      value={getSubInput(item)}
                      onChange={event => setSubInputs(prev => ({ ...prev, [item.id]: event.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => onUpsertBudget(item.id, parseFloat(String(getSubInput(item))) || 0)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
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
