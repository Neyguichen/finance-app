'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatEuro } from '@/lib/utils'

type Props = {
  ratioChargesRevenus: number | null
  tauxMaitrise: number | null
  topExpense?: { infos?: string | null; categorie?: { nom?: string; icone?: string | null }; montant?: number } | null
  topCategory?: { nom?: string; icone?: string | null; depense?: number } | null
  getNetAmount: (transaction: any) => number
}

export default function ComprendreV2({
  ratioChargesRevenus,
  tauxMaitrise,
  topExpense,
  topCategory,
  getNetAmount,
}: Props) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-300">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Comprendre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-800/70 p-3">
            <p className="text-[11px] text-slate-500">Charges fixes / revenus</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {ratioChargesRevenus == null ? '—' : `${ratioChargesRevenus}%`}
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/70 p-3">
            <p className="text-[11px] text-slate-500">Consommation des budgets</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {tauxMaitrise == null ? '—' : `${tauxMaitrise}%`}
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/70 p-3">
            <p className="text-[11px] text-slate-500">Plus grosse dépense</p>
            {topExpense ? (
              <>
                <p className="mt-1 truncate text-sm font-medium text-slate-200">
                  {topExpense.categorie?.icone || '💳'} {topExpense.infos || topExpense.categorie?.nom || 'Dépense'}
                </p>
                <p className="text-sm font-semibold text-rose-400">{formatEuro(getNetAmount(topExpense))}</p>
              </>
            ) : <p className="mt-1 text-lg font-semibold text-slate-500">—</p>}
          </div>
          <div className="rounded-lg bg-slate-800/70 p-3">
            <p className="text-[11px] text-slate-500">Catégorie principale</p>
            {topCategory ? (
              <>
                <p className="mt-1 truncate text-sm font-medium text-slate-200">
                  {topCategory.icone || '📂'} {topCategory.nom || 'Catégorie'}
                </p>
                <p className="text-sm font-semibold text-amber-400">{formatEuro(Number(topCategory.depense || 0))}</p>
              </>
            ) : <p className="mt-1 text-lg font-semibold text-slate-500">—</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <BarChart3 className="h-4 w-4 text-blue-400" /> Analyses détaillées
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Le bilan annuel existant reste disponible pendant la migration. Les analyses multi-périodes seront enrichies dans leur phase dédiée.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/bilan-annuel">Voir le bilan annuel <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
