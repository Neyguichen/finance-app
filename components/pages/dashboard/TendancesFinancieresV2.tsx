'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { useDashboardTrends } from '@/lib/hooks/useDashboardTrends'

type Props = { espaceId?: string; plannedIncome: number; plannedFixed: number; plannedVariable: number; actualVariable: number; topCategory?: { nom?: string; icone?: string | null; depense?: number } | null }
type Metric = 'depenses' | 'revenus' | 'epargne' | 'resultat' | 'remboursements'
const metricLabels: Record<Metric,string> = { depenses:'Dépenses', revenus:'Revenus', epargne:'Épargne nette', resultat:'Résultat net', remboursements:'Remboursements de dettes' }
const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px' }

export default function TendancesFinancieresV2({ espaceId, plannedIncome, plannedFixed, plannedVariable, actualVariable, topCategory }: Props) {
  const trends = useDashboardTrends(espaceId)
  const [metric, setMetric] = useState<Metric>('depenses')
  const [period, setPeriod] = useState<'6'|'12'|'all'>('6')
  const data = useMemo(() => { const all=trends.data || []; return period==='all' ? all : all.slice(-Number(period)) }, [trends.data, period])
  const values = data.map(row => Number(row[metric]))
  const current = values.length ? values[values.length - 1] : 0
  const previous = values.length > 1 ? values[values.length - 2] : null
  const average = values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0
  const max = values.length ? Math.max(...values) : 0
  const deltaPct = previous != null && previous !== 0 ? Math.round(((current-previous)/Math.abs(previous))*100) : null
  const fixedWeight = plannedIncome > 0 ? Math.round((plannedFixed/plannedIncome)*100) : null
  const variableUsage = plannedVariable > 0 ? Math.round((actualVariable/plannedVariable)*100) : null

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-2"><CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base text-slate-100"><span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-300" />Tendances financières</span><Link href="/bilan-annuel" className="inline-flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-indigo-300">Voir le bilan annuel <ArrowRight className="h-3.5 w-3.5" /></Link></CardTitle></CardHeader>
      <CardContent className="space-y-4 p-4 pt-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <select value={metric} onChange={e=>setMetric(e.target.value as Metric)} className="select select-bordered select-sm w-full bg-slate-950 sm:w-auto">{Object.entries(metricLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          <div className="grid grid-cols-3 rounded-lg border border-slate-800 bg-slate-950/50 p-1 text-xs">{(['6','12','all'] as const).map(p=><button key={p} onClick={()=>setPeriod(p)} className={`rounded-md px-3 py-1.5 ${period===p?'bg-indigo-600 text-white':'text-slate-500 hover:text-slate-300'}`}>{p==='all'?'Tout':`${p} mois`}</button>)}</div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="min-h-[210px] rounded-xl border border-slate-800/70 bg-slate-950/25 p-2">
            {trends.isLoading ? <div className="flex h-[200px] items-center justify-center"><span className="loading loading-spinner loading-sm" /></div> : data.length < 2 ? <div className="flex h-[200px] items-center justify-center text-sm text-slate-600">Pas encore assez d’historique.</div> : <ResponsiveContainer width="100%" height={210}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="label" tick={{fontSize:10,fill:'#64748b'}} /><YAxis width={48} tick={{fontSize:10,fill:'#64748b'}} /><Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>formatEuro(v)} /><Line type="monotone" dataKey={metric} stroke="#6366f1" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}} name={metricLabels[metric]} /></LineChart></ResponsiveContainer>}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Stat label="Mois actuel" value={formatEuro(current)} />
            <Stat label="Moyenne période" value={formatEuro(average)} />
            <Stat label="Plus haut" value={formatEuro(max)} />
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3"><p className="text-[10px] text-slate-600">Vs mois précédent</p><p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${deltaPct == null ? 'text-slate-400' : deltaPct > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{deltaPct == null ? '—' : <>{deltaPct > 0 ? <TrendingUp className="h-3.5 w-3.5"/>:<TrendingDown className="h-3.5 w-3.5"/>}{Math.abs(deltaPct)}%</>}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="Poids des charges fixes" value={fixedWeight == null ? '—' : `${fixedWeight}%`} help="des revenus prévus" />
          <Stat label="Budget variable consommé" value={variableUsage == null ? '—' : `${variableUsage}%`} help={plannedVariable > 0 ? `${formatEuro(Math.max(0, plannedVariable-actualVariable))} encore disponibles` : undefined} />
          <Stat label="Catégorie principale" value={topCategory ? `${topCategory.icone || '📂'} ${topCategory.nom || 'Catégorie'}` : '—'} help={topCategory ? formatEuro(Number(topCategory.depense || 0)) : undefined} />
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({label,value,help}:{label:string;value:string;help?:string}) { return <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3"><p className="text-[10px] text-slate-600">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-200">{value}</p>{help&&<p className="mt-1 text-[10px] text-slate-600">{help}</p>}</div> }
