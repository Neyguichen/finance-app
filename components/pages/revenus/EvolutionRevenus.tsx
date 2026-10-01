'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { IncomeHistoryMonth } from '@/lib/hooks/useIncomeHistory'

type Props = { monthly: IncomeHistoryMonth[]; loading?: boolean }

export default function EvolutionRevenus({ monthly, loading }: Props) {
  const [period,setPeriod] = useState<'6'|'12'|'all'>('6')
  const data = useMemo(() => {
    const source = period === 'all' ? monthly : monthly.slice(-Number(period))
    return source.map(row => ({...row,label:new Date(row.month+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'short'})}))
  },[monthly,period])

  return <Card className="nf-card-hover h-full">
    <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between gap-3 text-base text-slate-100"><span>Évolution des revenus</span>
      <label className="relative"><select value={period} onChange={event => setPeriod(event.target.value as '6'|'12'|'all')} className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-xs font-medium text-slate-200 outline-none"><option value="6">6 mois</option><option value="12">12 mois</option><option value="all">Tout</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"/></label>
    </CardTitle></CardHeader>
    <CardContent className="p-3 pt-1">
      {loading ? <div className="flex h-[220px] items-center justify-center"><span className="loading loading-spinner loading-sm"/></div> : data.length < 2 ? <div className="flex h-[220px] items-center justify-center text-sm text-slate-600">Pas encore assez d’historique.</div> :
      <ResponsiveContainer width="100%" height={220}><ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
        <XAxis dataKey="label" tick={{fontSize:10,fill:'#64748b'}}/>
        <YAxis width={52} tick={{fontSize:10,fill:'#64748b'}}/>
        <Tooltip contentStyle={{backgroundColor:'#020617',border:'1px solid #475569',borderRadius:'10px'}} formatter={(value:number,name:string) => [formatEuro(value),name==='received'?'Reçus':'Prévus']}/>
        <Bar dataKey="received" name="Reçus" fill="#0ea5e9" radius={[4,4,0,0]}/>
        <Line dataKey="planned" name="Prévus" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="6 4" dot={{r:3}}/>
      </ComposedChart></ResponsiveContainer>}
    </CardContent>
  </Card>
}
