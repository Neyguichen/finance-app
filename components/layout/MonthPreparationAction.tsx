'use client'

import { CalendarPlus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthPreparationPreview from '@/components/pages/dashboard/MonthPreparationPreview'
import { useMonthPreparation, usePrepareMonth } from '@/lib/hooks/useMonthPreparation'

export default function MonthPreparationAction() {
  const { espace, moisId, month, userId, isAdminViewing } = useApp()
  const [open, setOpen] = useState(false)
  const preview = useMonthPreparation(espace?.id, month, open ? 'habits' : null)
  const prepareMonth = usePrepareMonth(espace?.id, month, userId ?? undefined)
  const prepared = !!moisId

  const itemById = useMemo(
    () => new Map((preview.data?.items || []).map(item => [item.id, item])),
    [preview.data?.items]
  )

  if (!espace || !userId || isAdminViewing) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={prepared
          ? 'inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 transition hover:text-slate-300'
          : 'inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200 transition hover:bg-amber-500/15'}
      >
        {prepared ? <RefreshCw className="h-3 w-3" /> : <CalendarPlus className="h-3 w-3" />}
        {prepared ? 'Ajouter les nouvelles récurrences' : 'Préparer ce mois'}
      </button>

      <MonthPreparationPreview
        open={open}
        onOpenChange={setOpen}
        espaceId={espace.id}
        month={month}
        mode="habits"
        isRefresh={prepared}
        onConfirm={async selectedIds => {
          const items = selectedIds
            .map(id => itemById.get(id))
            .filter(Boolean) as NonNullable<typeof preview.data>['items']
          await prepareMonth.mutateAsync(items)
        }}
      />
    </>
  )
}
