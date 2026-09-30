'use client'

import { CalendarClock, ChevronRight } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import { formatMois } from '@/lib/utils'

const MONTHLY_ROUTES = ['/revenus', '/depenses', '/epargne']

export default function MonthPreparationStatus() {
  const pathname = usePathname()
  const router = useRouter()
  const { moisId, month, espace, isAdminViewing } = useApp()

  const monthlyPage = MONTHLY_ROUTES.some(route => pathname.startsWith(route))
  if (!monthlyPage || moisId || !espace || isAdminViewing) return null

  return (
    <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2">
            <CalendarClock className="h-4 w-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-100">Mois non préparé</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {formatMois(month)} n’existe pas encore dans ce Budget. La consultation ne crée aucune donnée.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/15"
        >
          Préparer ce mois
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
