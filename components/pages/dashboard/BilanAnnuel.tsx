'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, CircleDollarSign,
  Lightbulb, PiggyBank, ReceiptText, ShieldCheck, TrendingDown, TrendingUp, WalletCards,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  yearData: any
  compareData?: any
  selectedYear: string
  compareYear?: string
  categories: any[]
  selectedBalance?: number | null
  compareBalance?: number | null
}

type Tab = 'overview' | 'categories' | 'planned' | 'evolution' | 'understand'

const palette = ['#3b82f6','#ef476f','#4ade80','#a855f7','#06b6d4','#f59e0b','#8b5cf6','#f97316','#14b8a6','#64748b']
const tooltipStyle = { backgroundColor:'#020617', border:'1px solid #475569', borderRadius:'10px', color:'#e2e8f0' }
const monthName = (m:string) => ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'][Number(m.slice(5,7))-1] || m

function pctChange(value:number, previous:number) {
  if (!previous) return null
  return ((value - previous) / Math.abs(previous)) * 100
}

function CompareText({ value, previous, inverse=false, compareYear }: { value:number; previous?:number; inverse?:boolean; compareYear?:string }) {
  if (previous == null || !compareYear) return <span className="text-slate-600">Pas de comparaison</span>
  const pct = pctChange(value, previous)
  if (pct == null) return <span className="text-slate-600">— vs {compareYear}</span>
  const improved = inverse ? pct <= 0 : pct >= 0
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight
  return <span className={`inline-flex items-center gap-1 ${improved ? 'text-emerald-400' : 'text-rose-400'}`}><Icon className="h-3 w-3" />{pct >= 0 ? '+' : ''}{pct.toFixed(1).replace('.', ',')} % vs {compareYear}</span>
}

function KpiCard({ icon:Icon, label, value, previous, compareYear, tone, inverse=false, help }:{
  icon:any; label:string; value:number; previous?:number; compareYear?:string; tone:string; inverse?:boolean; help?:string
}) {
  return <Card className="nf-card-hover">
    <CardContent className="flex min-h-[112px] items-center gap-4 p-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-300">{label}</p>
        <p className="mt-1 text-xl font-bold text-slate-100">{formatEuro(value)}</p>
        <p className="mt-1 text-[10px]"><CompareText value={value} previous={previous} inverse={inverse} compareYear={compareYear} /></p>
        {help && <p className="mt-1 text-[10px] text-slate-600">{help}</p>}
      </div>
    </CardContent>
  </Card>
}

function SmallStat({ label, value, help, tone='text-slate-100', icon:Icon, iconTone='text-slate-400' }:{ label:string; value:string; help?:string; tone?:string; icon?:any; iconTone?:string }) {
  return <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
    <div className="flex items-start gap-2.5">
      {Icon && <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/80 ${iconTone}`}><Icon className="h-4 w-4" /></div>}
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className={`mt-1 truncate text-sm font-semibold ${tone}`}>{value}</p>
        {help && <p className="mt-1 text-[10px] text-slate-600">{help}</p>}
      </div>
    </div>
  </div>
}

function LegendRow({ items }:{ items:Array<{label:string;color:string}> }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
    {items.map(item => <span key={item.label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:item.color}} />{item.label}</span>)}
  </div>
}

function PieTooltip({ active, payload }:{ active?:boolean; payload?:any[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return <div className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 shadow-2xl">
    <p className="text-xs font-semibold text-slate-100">{item?.name || 'Dépense'}</p>
    <p className="mt-1 text-sm font-bold text-slate-100">{formatEuro(Number(item?.value || 0))}</p>
  </div>
}

export default function BilanAnnuel({
  yearData, compareData, selectedYear, compareYear, categories, selectedBalance, compareBalance,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categoryById = useMemo(() => new Map(categories.map((c:any) => [c.id, c])), [categories])
  const parentCategories = useMemo(() => categories.filter((c:any) => !c.parent_id && c.actif !== false), [categories])

  const monthlyRows = useMemo(() => {
    if (!yearData?.monthlyData) return []
    const keys = Object.keys(yearData.monthlyData).sort()
    const raw = keys.map((key) => {
      const m:any = yearData.monthlyData[key]
      const income = Number(m.revenusRecus || 0)
      const expenses = Number(m.chargesReelles || 0) + Number(m.depenses || 0)
      const plannedExpenses = Number(m.charges || 0) + Number(m.budgets || 0)
      const savings = Number(m.epargne || 0) - Number(m.reprises || 0)
      const net = income + Number(m.reprises || 0) + Number(m.remboursementsCreance || 0)
        - Number(m.chargesReelles || 0) - Number(m.depenses || 0) - Number(m.epargne || 0) - Number(m.remboursementsDette || 0)
      return { key, month:monthName(key), revenus:income, depenses:expenses, prevu:plannedExpenses, epargne:savings, net, disponible:0 }
    })
    if (selectedBalance != null && raw.length) {
      const totalNet = raw.reduce((sum,row) => sum + row.net, 0)
      let balance = Number(selectedBalance) - totalNet
      raw.forEach(row => { balance += row.net; row.disponible = balance })
    }
    return raw
  }, [yearData, selectedBalance])

  const categoryRows = useMemo(() => {
    const grouped = new Map<string,{id:string;name:string;icon:string;actual:number;planned:number}>()
    Object.entries(yearData?.catAnnualStats || {}).forEach(([id,stat]:[string,any]) => {
      const cat:any = categoryById.get(id)
      const parentId = cat?.parent_id || id
      const parent:any = categoryById.get(parentId) || cat
      const current = grouped.get(parentId) || { id:parentId, name:parent?.nom || 'Sans catégorie', icon:parent?.icone || '📂', actual:0, planned:0 }
      current.actual += Number(stat.total || 0)
      current.planned += Number(stat.planned || 0)
      grouped.set(parentId,current)
    })
    return Array.from(grouped.values()).filter(row => row.actual > 0 || row.planned > 0).sort((a,b) => b.actual - a.actual)
  }, [yearData, categoryById])

  const subCategoryRows = useMemo(() => {
    if (!selectedCategory) return []
    const parentTotal = categoryRows.find(row => row.id === selectedCategory)?.actual || 0
    const parentPlanned = categoryRows.find(row => row.id === selectedCategory)?.planned || 0
    const children = categories.filter((c:any) => c.parent_id === selectedCategory)
      .map((c:any) => ({
        id:c.id,
        name:c.nom,
        icon:c.icone || '•',
        actual:Number(yearData?.subCatAnnualStats?.[c.id]?.total || 0),
        planned:Number(yearData?.subCatAnnualStats?.[c.id]?.planned || 0),
      }))
      .filter((row:any) => row.actual > 0 || row.planned > 0)
      .sort((a:any,b:any) => b.actual - a.actual)
    const usedActual = children.reduce((sum:number,row:any) => sum + row.actual,0)
    const usedPlanned = children.reduce((sum:number,row:any) => sum + row.planned,0)
    if (parentTotal > usedActual + 0.01 || parentPlanned > usedPlanned + 0.01) {
      children.push({
        id:'uncategorized',
        name:'Sans sous-catégorie',
        icon:'•',
        actual:Math.max(0,parentTotal-usedActual),
        planned:Math.max(0,parentPlanned-usedPlanned),
      })
    }
    return children
  }, [selectedCategory, categories, yearData, categoryRows])

  const selectedCategoryInfo = categoryRows.find(row => row.id === selectedCategory)
  const distributionRows:any[] = selectedCategory ? subCategoryRows : categoryRows.map(row => ({...row,value:row.actual}))
  const distributionTotal = distributionRows.reduce((sum,row) => sum + Number(row.value ?? row.actual),0)

  const actualExpenses = Number(yearData?.annualTotals?.chargesReelles || 0) + Number(yearData?.annualTotals?.depenses || 0)
  const plannedExpenses = Number(yearData?.annualTotals?.charges || 0) + Number(yearData?.annualTotals?.budgets || 0)
  const compareActualExpenses = compareData ? Number(compareData.annualTotals?.chargesReelles || 0) + Number(compareData.annualTotals?.depenses || 0) : undefined
  const income = Number(yearData?.annualTotals?.revenusRecus || 0)
  const compareIncome = compareData ? Number(compareData.annualTotals?.revenusRecus || 0) : undefined
  const savings = Number(yearData?.epargneNette || 0)
  const compareSavings = compareData ? Number(compareData.epargneNette || 0) : undefined
  const balanceValue = selectedBalance ?? Number(yearData?.mouvementNet || 0)
  const compareBalanceValue = compareBalance ?? (compareData ? Number(compareData.mouvementNet || 0) : undefined)

  const fixedShare = income > 0 ? (Number(yearData?.annualTotals?.chargesReelles || 0) / income) * 100 : 0
  const avgExpense = yearData?.nbActiveMonths ? actualExpenses / yearData.nbActiveMonths : 0
  const avgIncome = yearData?.nbActiveMonths ? income / yearData.nbActiveMonths : 0
  const topCategory = categoryRows[0]
  const biggestGap = [...categoryRows].sort((a,b) => Math.abs(b.actual-b.planned) - Math.abs(a.actual-a.planned))[0]

  const insights = useMemo(() => {
    const items:Array<{title:string;detail:string;tone:string;icon:any}> = []
    if (topCategory) items.push({ title:`${topCategory.icon} ${topCategory.name} est votre premier poste de dépense`, detail:`${formatEuro(topCategory.actual)} sur la période, soit ${distributionTotal > 0 ? Math.round(topCategory.actual/distributionTotal*100) : 0}% des dépenses catégorisées.`, tone:'text-blue-300', icon:WalletCards })
    if (biggestGap && biggestGap.planned > 0) {
      const diff=biggestGap.actual-biggestGap.planned
      items.push({ title:`${biggestGap.name} : principal écart au budget`, detail:`${diff >= 0 ? '+' : ''}${formatEuro(diff)} entre le prévu et le réel.`, tone:diff>0?'text-rose-300':'text-emerald-300', icon:BarChart3 })
    }
    items.push({ title:`Vos charges fixes représentent ${fixedShare.toFixed(1).replace('.',',')}% de vos revenus`, detail:`${formatEuro(yearData?.annualTotals?.chargesReelles || 0)} de charges fixes sur ${formatEuro(income)} de revenus reçus.`, tone:'text-amber-300', icon:ReceiptText })
    items.push({ title:`Taux d’épargne net : ${Number(yearData?.tauxEpargne || 0)}%`, detail:`Épargne nette de ${formatEuro(savings)} sur la période sélectionnée.`, tone:savings>=0?'text-emerald-300':'text-rose-300', icon:PiggyBank })
    if (compareData && compareYear) {
      const delta=actualExpenses-Number(compareActualExpenses || 0)
      items.push({ title:`Dépenses ${delta >= 0 ? 'en hausse' : 'en baisse'} par rapport à ${compareYear}`, detail:`${delta >= 0 ? '+' : ''}${formatEuro(delta)} sur la période comparable.`, tone:delta<=0?'text-emerald-300':'text-rose-300', icon:delta<=0?TrendingDown:TrendingUp })
    }
    return items
  }, [topCategory,biggestGap,fixedShare,yearData,income,savings,compareData,compareYear,compareActualExpenses,actualExpenses,distributionTotal])

  const tabs:{id:Tab;label:string}[] = [
    {id:'overview',label:'Vue d’ensemble'},
    {id:'categories',label:'Catégories'},
    {id:'planned',label:'Prévu vs réel'},
    {id:'evolution',label:'Évolution'},
    {id:'understand',label:'À comprendre'},
  ]

  const Distribution = ({ detailed=false }:{detailed?:boolean}) => (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base text-slate-100">
          <span>{selectedCategory ? selectedCategoryInfo?.name : 'Où va mon argent ?'}</span>
          {selectedCategory && <button type="button" onClick={() => setSelectedCategory(null)} className="inline-flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-indigo-300"><ArrowLeft className="h-3.5 w-3.5"/>Retour</button>}
        </CardTitle>
      </CardHeader>
      <CardContent className={`grid gap-4 p-4 pt-1 ${detailed ? 'lg:grid-cols-[300px_1fr]' : 'md:grid-cols-[220px_1fr]'}`}>
        <div className={`relative ${detailed ? 'h-[280px]' : 'h-[220px]'}`}>
          {distributionRows.length ? <div className="relative z-10 h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distributionRows} dataKey="actual" nameKey="name" innerRadius={detailed?72:58} outerRadius={detailed?112:88} paddingAngle={1} onClick={(entry:any) => { if(!selectedCategory && entry?.id) setSelectedCategory(entry.id) }}>{distributionRows.map((row,index)=><Cell key={row.id} fill={palette[index%palette.length]} className={!selectedCategory?'cursor-pointer':''}/>)}</Pie><Tooltip content={<PieTooltip />} wrapperStyle={{zIndex:60,pointerEvents:'none'}} /></PieChart></ResponsiveContainer></div> : null}
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center"><strong className="text-base">{formatEuro(distributionTotal)}</strong><span className="text-[10px] text-slate-600">{selectedCategory?'Sous-catégories':'Dépenses'}</span></div>
        </div>
        <div className="space-y-1 self-center">
          {distributionRows.slice(0,detailed?12:7).map((row:any,index:number) => {
            const val=Number(row.actual ?? row.value)
            const pct=distributionTotal>0?Math.round(val/distributionTotal*100):0
            return <button key={row.id} type="button" onClick={() => { if(!selectedCategory && row.id) setSelectedCategory(row.id) }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left ${!selectedCategory?'hover:bg-slate-800/50':''}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:palette[index%palette.length]}}/>
              <span className="min-w-0 flex-1 truncate text-xs">{row.icon} {row.name}</span>
              <span className="text-xs text-slate-300">{formatEuro(val)}</span>
              <span className="w-10 text-right text-[11px] text-slate-500">{pct}%</span>
              {!selectedCategory && <ArrowRight className="h-3 w-3 text-slate-700"/>}
            </button>
          })}
        </div>
      </CardContent>
    </Card>
  )

  const PlannedVsActual = ({ compact=false }:{compact?:boolean}) => {
    const topGaps=[...categoryRows].sort((a,b)=>Math.abs(b.actual-b.planned)-Math.abs(a.actual-a.planned)).slice(0,compact?4:10)
    return <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Prévu vs réel</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-4 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <SmallStat icon={ReceiptText} iconTone="text-rose-300" label="Réel" value={formatEuro(actualExpenses)} tone="text-rose-300" />
          <SmallStat icon={ShieldCheck} iconTone="text-blue-300" label="Prévu" value={formatEuro(plannedExpenses)} tone="text-blue-300" />
          <SmallStat
            icon={BarChart3}
            iconTone={actualExpenses > plannedExpenses ? 'text-rose-300' : 'text-emerald-300'}
            label="Écart"
            value={(actualExpenses-plannedExpenses>=0?'+':'')+formatEuro(actualExpenses-plannedExpenses)}
            tone={actualExpenses>plannedExpenses?'text-rose-300':'text-emerald-300'}
          />
        </div>
        {monthlyRows.length > 1 && <>
          <LegendRow items={[{label:'Prévu',color:'#3b82f6'},{label:'Réel',color:'#ef476f'}]} />
          <div className={compact?'h-[180px]':'h-[280px]'}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRows}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b'}}/><YAxis width={48} tick={{fontSize:10,fill:'#64748b'}}/><Tooltip contentStyle={tooltipStyle} labelStyle={{color:'#f8fafc'}} itemStyle={{color:'#e2e8f0'}} formatter={(v:number)=>formatEuro(v)}/><Bar dataKey="prevu" fill="#3b82f6" radius={[3,3,0,0]} name="Prévu"/><Bar dataKey="depenses" fill="#ef476f" radius={[3,3,0,0]} name="Réel"/></BarChart></ResponsiveContainer></div>
        </>}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Top des écarts</p>
          <div className="divide-y divide-slate-800/60">
            {topGaps.map(row => { const diff=row.actual-row.planned; return <div key={row.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2 text-xs"><span className="truncate text-slate-300">{row.icon} {row.name}</span><span className="text-slate-500">{formatEuro(row.planned)}</span><span className="text-slate-300">{formatEuro(row.actual)}</span><span className={diff>0?'text-rose-400':'text-emerald-400'}>{diff>=0?'+':''}{formatEuro(diff)}</span></div> })}
          </div>
        </div>
      </CardContent>
    </Card>
  }

  const Evolution = ({ compact=false }:{compact?:boolean}) => (
    <Card className="nf-card-hover">
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Comment évolue ma situation ?</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-4 pt-1">
        <LegendRow items={[{label:'Revenus',color:'#34d399'},{label:'Dépenses',color:'#fb7185'},{label:'Épargne nette',color:'#38bdf8'}]} />
        <div className={compact?'h-[190px]':'h-[300px]'}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyRows}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b'}}/><YAxis width={48} tick={{fontSize:10,fill:'#64748b'}}/><Tooltip contentStyle={tooltipStyle} labelStyle={{color:'#f8fafc'}} itemStyle={{color:'#e2e8f0'}} formatter={(v:number)=>formatEuro(v)}/><Line type="monotone" dataKey="revenus" stroke="#34d399" strokeWidth={2.3} dot={{r:2}} name="Revenus"/><Line type="monotone" dataKey="depenses" stroke="#fb7185" strokeWidth={2.3} dot={{r:2}} name="Dépenses"/><Line type="monotone" dataKey="epargne" stroke="#38bdf8" strokeWidth={2.3} dot={{r:2}} name="Épargne nette"/></LineChart></ResponsiveContainer></div>
        {selectedBalance != null && <div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-400">Disponible fin de mois</p><LegendRow items={[{label:'Disponible',color:'#3b82f6'}]} /></div><div className={compact?'h-[100px]':'h-[150px]'}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRows}><XAxis dataKey="month" tick={{fontSize:9,fill:'#64748b'}}/><Tooltip contentStyle={tooltipStyle} labelStyle={{color:'#f8fafc'}} itemStyle={{color:'#e2e8f0'}} formatter={(v:number)=>formatEuro(v)}/><Bar dataKey="disponible" fill="#3b82f6" radius={[4,4,0,0]} name="Disponible"><LabelList dataKey="disponible" position="top" offset={8} formatter={(value:number) => { const rounded=Math.round(value); return `${rounded>=0?'+':''}${rounded} €` }} className="fill-slate-300 text-[10px]" /></Bar></BarChart></ResponsiveContainer></div></div>}
      </CardContent>
    </Card>
  )

  const Insights = ({ compact=false }:{compact?:boolean}) => (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-slate-100"><Lightbulb className="h-4 w-4 text-amber-300"/>Ce qu&apos;il faut comprendre</CardTitle></CardHeader>
      <CardContent className="space-y-2 p-3 pt-1">
        {insights.slice(0,compact?5:10).map((item,index) => { const Icon=item.icon; return <div key={index} className="flex gap-3 rounded-xl border border-slate-800/70 bg-slate-950/25 p-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 ${item.tone}`}><Icon className="h-4 w-4"/></div><div><p className="text-xs font-semibold text-slate-200">{item.title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{item.detail}</p></div></div> })}
      </CardContent>
    </Card>
  )

  const Stats = () => (
    <Card className="nf-card-hover">
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Mes principales statistiques</CardTitle></CardHeader>
      <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SmallStat icon={WalletCards} iconTone="text-cyan-300" label="Dépense moyenne / mois" value={formatEuro(avgExpense)} />
        <SmallStat icon={TrendingUp} iconTone="text-emerald-300" label="Revenu moyen / mois" value={formatEuro(avgIncome)} />
        <SmallStat icon={PiggyBank} iconTone="text-fuchsia-300" label="Taux d’épargne" value={Number(yearData?.tauxEpargne || 0).toFixed(1).replace('.',',')+' %'} />
        <SmallStat icon={ReceiptText} iconTone="text-rose-300" label="Charges fixes" value={fixedShare.toFixed(1).replace('.',',')+' %'} help="des revenus reçus" />
        <SmallStat icon={BarChart3} iconTone="text-violet-300" label="Catégorie principale" value={topCategory ? `${topCategory.icon} ${topCategory.name}` : '—'} help={topCategory?formatEuro(topCategory.actual):undefined} />
        <SmallStat icon={CircleDollarSign} iconTone="text-blue-300" label="Mois le plus dépensier" value={yearData?.moisMaxDepense?.mois ? monthName(yearData.moisMaxDepense.mois) : '—'} help={yearData?.moisMaxDepense?.total?formatEuro(yearData.moisMaxDepense.total):undefined} />
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max rounded-xl border border-slate-800 bg-slate-950/35 p-1">
          {tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2 text-xs font-medium transition ${tab===item.id?'bg-indigo-600 text-white':'text-slate-400 hover:text-slate-200'}`}>{item.label}</button>)}
        </div>
      </div>

      {tab === 'overview' && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={ShieldCheck} label="Revenus" value={income} previous={compareIncome} compareYear={compareYear} tone="bg-emerald-500/10 text-emerald-300" />
          <KpiCard icon={WalletCards} label="Dépenses" value={actualExpenses} previous={compareActualExpenses} compareYear={compareYear} inverse tone="bg-rose-500/10 text-rose-300" />
          <KpiCard icon={PiggyBank} label="Épargne nette" value={savings} previous={compareSavings} compareYear={compareYear} tone="bg-fuchsia-500/10 text-fuchsia-300" help={income>0?(savings/income*100).toFixed(1).replace('.',',')+' % des revenus':''} />
          <KpiCard icon={CircleDollarSign} label={selectedBalance!=null?'Disponible fin de période':'Variation nette'} value={balanceValue} previous={compareBalanceValue} compareYear={compareYear} tone="bg-blue-500/10 text-blue-300" />
        </div>
        <div className="grid gap-3 xl:grid-cols-[1.05fr_.95fr]"><Distribution /><PlannedVsActual compact /></div>
        <div className="grid gap-3 xl:grid-cols-[1.1fr_.9fr]"><Evolution compact /><Insights compact /></div>
        <Stats />
      </>}

      {tab === 'categories' && <>
        <Distribution detailed />
        <Card className="nf-card-hover"><CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Détail par catégorie</CardTitle></CardHeader><CardContent className="overflow-x-auto p-4 pt-1">
          <table className="w-full min-w-[650px] text-xs"><thead><tr className="border-b border-slate-800 text-slate-500"><th className="py-2 text-left">{selectedCategory ? 'Sous-catégorie' : 'Catégorie'}</th><th className="text-right">Prévu</th><th className="text-right">Réel</th><th className="text-right">Écart</th><th className="text-right">% des dépenses</th></tr></thead><tbody>{(selectedCategory ? subCategoryRows : categoryRows).map((row:any)=>{const planned=Number(row.planned||0);const actual=Number(row.actual||0);const diff=actual-planned;return <tr key={row.id} className="border-b border-slate-800/60"><td className="py-2.5 text-slate-200">{row.icon} {row.name}</td><td className="text-right text-slate-500">{formatEuro(planned)}</td><td className="text-right text-slate-200">{formatEuro(actual)}</td><td className={`text-right ${diff>0?'text-rose-400':'text-emerald-400'}`}>{diff>=0?'+':''}{formatEuro(diff)}</td><td className="text-right text-slate-500">{distributionTotal>0?Math.round(actual/distributionTotal*100):0}%</td></tr>})}</tbody></table>
        </CardContent></Card>
      </>}

      {tab === 'planned' && <PlannedVsActual />}
      {tab === 'evolution' && <Evolution />}
      {tab === 'understand' && <><Insights /><Stats /></>}
    </div>
  )
}
