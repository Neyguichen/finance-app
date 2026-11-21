'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

const palette = ['#0ea5e9','#34d399','#c084fc','#fbbf24','#fb7185','#60a5fa','#2dd4bf','#a78bfa']

type Props = {
  revenus: Array<{ id:string; nom:string; montant:number; montant_reel?:number|null; recu:boolean }>
}

export default function RepartitionRevenus({ revenus }: Props) {
  const rows = useMemo(() => revenus.filter(item => item.recu && Number(item.montant_reel ?? item.montant) > 0).map(item => ({ id:item.id, name:item.nom, value:Number(item.montant_reel ?? item.montant) })).sort((a,b) => b.value-a.value), [revenus])
  const total = rows.reduce((sum,row) => sum + row.value, 0)
  const [selected, setSelected] = useState<string | null>(null)

  return <Card className="income-distribution nf-card-hover h-full">
    <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Répartition des revenus reçus</CardTitle></CardHeader>
    <CardContent className="p-3 pt-1">
      {rows.length === 0 ? <div className="flex min-h-60 items-center justify-center text-sm text-slate-600">Aucun revenu reçu ce mois.</div> :
      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
          <div className="relative z-10 h-full"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={1} isAnimationActive={false} onClick={(data:any) => data?.id && setSelected(data.id)}>
              {rows.map((row,index) => <Cell key={row.id} fill={palette[index%palette.length]} className="cursor-pointer" />)}
            </Pie>
          </PieChart></ResponsiveContainer></div>
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"><strong className="text-base text-slate-100">{formatEuro(total)}</strong><span className="text-xs text-slate-400">Reçus</span></div>
        </div>
        <div className="space-y-1">
          {rows.slice(0,7).map((row,index) => {
            const pct = total > 0 ? Math.round(row.value/total*100) : 0
            return <button key={row.id} onClick={() => setSelected(row.id)} className={'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-800/50 ' + (selected===row.id ? 'bg-slate-800/60 ring-1 ring-slate-600/50' : '')}>
              <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:palette[index%palette.length]}}/><span className="min-w-0 flex-1 truncate text-xs">{row.name}</span><span className="text-[11px] text-slate-400">{formatEuro(row.value)} <span className="text-slate-600">({pct}%)</span></span>
            </button>
          })}
        </div>
      </div>}
    </CardContent>
  </Card>
}
