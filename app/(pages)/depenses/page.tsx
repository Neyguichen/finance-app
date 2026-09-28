'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, ReceiptText } from 'lucide-react'

export default function DepensesPage() {
  const { month, setMonth } = useApp()
  const [view, setView] = useState<'planned' | 'actual'>('planned')

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold">Dépenses</h1>
          <p className="text-sm text-slate-500">Planifier le mois et suivre ce qui a réellement été dépensé.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 border border-slate-800">
          <Button variant={view === 'planned' ? 'default' : 'ghost'} onClick={() => setView('planned')}>
            <CalendarClock className="w-4 h-4 mr-2" /> Prévues
          </Button>
          <Button variant={view === 'actual' ? 'default' : 'ghost'} onClick={() => setView('actual')}>
            <ReceiptText className="w-4 h-4 mr-2" /> Réelles
          </Button>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 space-y-3">
            {view === 'planned' ? (
              <>
                <div>
                  <p className="font-semibold">Dépenses prévues</p>
                  <p className="text-sm text-slate-500">Charges fixes prévues et budgets variables du mois.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/charges-fixes"><Button variant="outline" className="w-full">Charges fixes</Button></Link>
                  <Link href="/variables"><Button variant="outline" className="w-full">Budgets variables</Button></Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold">Dépenses réelles</p>
                  <p className="text-sm text-slate-500">Paiements fixes et transactions réellement enregistrées.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/charges-fixes"><Button variant="outline" className="w-full">Paiements fixes</Button></Link>
                  <Link href="/variables"><Button variant="outline" className="w-full">Transactions variables</Button></Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-slate-600">Transition V2 : les écrans V1 restent accessibles derrière cette vue pendant leur intégration progressive.</p>
      </div>
    </div>
  )
}
