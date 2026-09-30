'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMois, nextMonth, prevMonth } from '@/lib/utils'
import { useApp } from '@/components/AppContext'

interface Props {
  currentMonth: string
  onChange: (month: string) => void
}

export default function MonthSelector({ currentMonth, onChange }: Props) {
  const { syncing } = useApp()

  return (
    <div className="sticky top-0 z-40 border-b border-slate-800/70 bg-[#07101d]/88 px-3 py-2.5 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(prevMonth(currentMonth))}
          aria-label="Mois précédent"
          className="rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-semibold capitalize tracking-tight text-slate-100 sm:text-lg">
            {formatMois(currentMonth)}
          </h2>
          {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(nextMonth(currentMonth))}
          aria-label="Mois suivant"
          className="rounded-xl"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
