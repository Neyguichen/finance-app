'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface EvoBadgeProps {
  current: number
  previous: number | undefined | null
  invertColors?: boolean
}

export default function EvoBadge({ current, previous, invertColors = false }: EvoBadgeProps) {
  if (previous === undefined || previous === null) return null
  if (previous === 0 && current === 0) return null

  if (previous === 0 && current > 0) return (
    <span className={`inline-flex items-center gap-0.5 text-xs ml-2 ${invertColors ? 'text-red-400' : 'text-emerald-400'}`}>
      <TrendingUp className="w-3 h-3" />nouveau
    </span>
  )

  const pctChange = Math.round(((current - previous) / previous) * 100)

  if (pctChange === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 ml-2">
      <Minus className="w-3 h-3" />0%
    </span>
  )

  const isUp = pctChange > 0
  const colorUp = invertColors ? 'text-red-400' : 'text-emerald-400'
  const colorDown = invertColors ? 'text-emerald-400' : 'text-red-400'

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ml-2 ${isUp ? colorUp : colorDown}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pctChange}%
    </span>
  )
}