'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, Check, ChevronDown, ChevronRight, Clock3, Pencil, Plus, ReceiptText, Trash2, WalletCards } from 'lucide-react'
import { formatDate, formatEuro, localDateISO } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import DepenseForm from '@/components/pages/variables/DepenseForm'
import DepenseEditDialog from '@/components/pages/variables/DepenseEditDialog'
import DepenseDeleteDialog from '@/components/pages/variables/DepenseDeleteDialog'
import ChargeFixeForm from '@/components/pages/charges-fixes/ChargeFixeForm'
import { ChargeFixeEditDialog, ChargeFixeDeleteDialog, ChargeFixeScopeDialog } from '@/components/pages/charges-fixes/ChargeFixeDialogs'
import SplitDialog from '@/components/pages/variables/SplitDialog'
import { useRemboursements } from '@/lib/hooks/useRemboursements'
import ArchiveDialog from '@/components/pages/variables/ArchiveDialog'
import RemboursementDialog from '@/components/pages/variables/RemboursementDialog'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'
import EmptyStateV2 from '@/components/ui/EmptyStateV2'
import DepensesFab from '@/components/pages/depenses/DepensesFab'

type ActualFilter = 'all' | 'upcoming' | 'realized' | 'debited'
type BudgetDetailTab = 'subcategories' | 'transactions'

export default function DepensesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [view, setView] = useState<'planned' | 'actual'>('planned')
  const [actualFilter, setActualFilter] = useState<ActualFilter>('all')
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [budgetDetailTab, setBudgetDetailTab] = useState<BudgetDetailTab>('subcategories')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTx, setDeleteTx] = useState<any>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; nom: string } | null>(null)
  const [fixedOpen, setFixedOpen] = useState(false)
  const [editFixed, setEditFixed] = useState<any>(null)
  const [deleteFixed, setDeleteFixed] = useState<any>(null)
  const [scopeFixed, setScopeFixed] = useState<any>(null)
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    const requestedActualFilter = params.get('actualFilter')
    if (requestedView === 'planned' || requestedView === 'actual') setView(requestedView)
    if (requestedActualFilter === 'all' || requestedActualFilter === 'upcoming' || requestedActualFilter === 'realized' || requestedActualFilter === 'debited') {
      setActualFilter(requestedActualFilter)
    }
    if (params.get('plannedFilter') === 'variable') {
      window.setTimeout(() => document.getElementById('budgets-variables')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    }
  }, [])

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const add = new URLSearchParams(window.location.search).get('add')
    if (add === 'fixed') setFixedOpen(true)
    if (add === 'variable') setTxOpen(true)
  }, [isAdminViewing, moisId])

  const { data: categories = [], create: createCat, remove: archiveCat } = useCategories(espace?.id)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: charges = [], togglePayee, create: createFixed, update: updateFixed, remove: removeFixed, removeDefinitif } = useChargesFixes(moisId)
  const { create: createFixedRecurring, update: updateFixedRecurring } = useChargesFixesRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(rembTx?.id)

  const effectiveCategories: any[] = isAdminViewing ? (adminData?.categories || []) : categories
  const effectiveBudgets: any[] = isAdminViewing ? (adminData?.budgets || []) : budgets
  const effectiveTransactions: any[] = isAdminViewing ? (adminData?.transactions || []) : transactions
  const effectiveFlat: any[] = isAdminViewing ? (adminData?.transactions || []).filter((t: any) => !t.is_split) : allFlat
  const effectiveCharges: any[] = (isAdminViewing ? (adminData?.charges_fixes || []) : charges).map((charge: any) => {
    const category = effectiveCategories.find((item: any) => item.id === charge.categorie_id)
    const subcategory = effectiveCategories.find((item: any) => item.id === charge.sous_categorie_id)
    return {
      ...charge,
      categorie_nom: category?.nom ?? null,
      categorie_icone: category?.icone ?? null,
      sous_categorie_nom: subcategory?.nom ?? null,
    }
  })

  const parentCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const subCats = (id: string) => effectiveCategories.filter((c: any) => c.parent_id === id && c.actif !== false)
  const budget = (id: string) => Number(effectiveBudgets.find((b: any) => b.categorie_id === id)?.prevu || 0)
  const net = (tx: any) => Number(tx.montant) - (tx.remboursements || []).reduce((sum: number, item: any) => sum + Number(item.montant), 0)
  const spent = (id: string, sub = false) => effectiveFlat.filter((t: any) => (sub ? t.sous_categorie_id : t.categorie_id) === id).reduce((sum: number, t: any) => sum + net(t), 0)
  const parentCategoryIds = new Set(parentCategories.map((c: any) => c.id))
  const parentBudgets = effectiveBudgets.filter((b: any) => parentCategoryIds.has(b.categorie_id))
  const expenseSummary = summarizeAnalyticalExpenses(effectiveCharges, parentBudgets, effectiveFlat)
  const { plannedFixed, actualFixed: paidFixed, plannedVariable, actualVariable, plannedTotal, actualTotal } = expenseSummary
  const variance = actualTotal - plannedTotal
  const actualPercent = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0

  const fixedShare = plannedTotal > 0 ? Math.round((plannedFixed / plannedTotal) * 100) : 0
  const variableShare = plannedTotal > 0 ? Math.round((plannedVariable / plannedTotal) * 100) : 0
  const otherShare = Math.max(0, 100 - fixedShare - variableShare)

  const selectedCategory = useMemo(() => {
    if (!parentCategories.length) return null
    return parentCategories.find((cat: any) => cat.id === selectedBudgetId)
      || parentCategories.find((cat: any) => budget(cat.id) > 0)
      || parentCategories[0]
  }, [parentCategories, selectedBudgetId, effectiveBudgets])

  useEffect(() => {
    if (selectedCategory && selectedCategory.id !== selectedBudgetId) setSelectedBudgetId(selectedCategory.id)
  }, [selectedCategory, selectedBudgetId])

  const selectedBudget = selectedCategory ? budget(selectedCategory.id) : 0
  const selectedSpent = selectedCategory ? spent(selectedCategory.id) : 0
  const selectedRemaining = selectedBudget - selectedSpent
  const selectedProgress = selectedBudget > 0 ? Math.min(100, Math.round((selectedSpent / selectedBudget) * 100)) : selectedSpent > 0 ? 100 : 0
  const selectedSubcats = selectedCategory ? subCats(selectedCategory.id).map((sub: any) => ({
    ...sub,
    planned: budget(sub.id),
    actual: spent(sub.id, true),
  })) : []
  const selectedTransactions = selectedCategory
    ? effectiveFlat.filter((tx: any) => tx.categorie_id === selectedCategory.id).slice(0, 6)
    : []

  const today = localDateISO()

  const actualEntries = useMemo(() => {
    const fixedEntries = effectiveCharges.map((charge: any) => {
      const date = charge.payee ? (charge.date_reelle || charge.date_prevue || month.slice(0, 7) + '-01') : (charge.date_prevue || month.slice(0, 7) + '-01')
      const status: Exclude<ActualFilter, 'all'> = !charge.payee ? 'upcoming' : charge.date_reelle ? 'debited' : 'realized'
      return {
        id: 'fixed-' + charge.id,
        source: 'fixed' as const,
        sourceData: charge,
        date,
        status,
        title: charge.nom,
        category: charge.categorie_nom || 'Charge fixe',
        subcategory: charge.sous_categorie_nom || null,
        icon: charge.categorie_icone || '🏠',
        amount: Number(charge.payee ? (charge.montant_reel ?? charge.montant) : charge.montant),
      }
    })

    const transactionEntries = effectiveTransactions.map((tx: any) => {
      const effectiveDate = tx.date_validation || tx.date
      const status: Exclude<ActualFilter, 'all'> = tx.date_validation ? 'debited' : tx.date > today ? 'upcoming' : 'realized'
      return {
        id: 'tx-' + tx.id,
        source: 'transaction' as const,
        sourceData: tx,
        date: effectiveDate,
        status,
        title: tx.categorie?.nom || 'Sans catégorie',
        category: tx.categorie?.nom || 'Sans catégorie',
        subcategory: tx.sous_categorie?.nom || null,
        icon: tx.categorie?.icone || '📦',
        amount: net(tx),
        info: tx.infos || null,
      }
    })

    return [...fixedEntries, ...transactionEntries].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [effectiveCharges, effectiveTransactions, month, today])

  const filteredActualEntries = actualEntries.filter(entry => actualFilter === 'all' || entry.status === actualFilter)

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, typeof filteredActualEntries>()
    const yesterdayDate = new Date(today + 'T12:00:00')
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = localDateISO(yesterdayDate)

    for (const entry of filteredActualEntries) {
      const label = entry.date === today
        ? "Aujourd'hui"
        : entry.date === yesterday
          ? 'Hier'
          : formatDate(entry.date)
      const list = groups.get(label) || []
      list.push(entry)
      groups.set(label, list)
    }
    return Array.from(groups.entries())
  }, [filteredActualEntries, today])

  const createTransaction = async (data: any) => {
    if (!moisId || isAdminViewing) return
    await createTx.mutateAsync({ mois_id: moisId, ...data })
  }

  const createSplitTransaction = async (data: any, lines: any[]) => {
    if (!moisId || isAdminViewing) return
    const parent = await createTx.mutateAsync({ mois_id: moisId, ...data })
    await split.mutateAsync({ parentId: parent.id, lines })
  }

  const createFixedExpense = async (value: { nom: string; montant: number; frequence: number; categorie_id?: string | null; sous_categorie_id?: string | null }) => {
    if (!moisId || !espace || isAdminViewing) return
    let recurrent_id: string | null = null
    if (value.frequence > 0) {
      const recurrent = await createFixedRecurring.mutateAsync({
        espace_id: espace.id,
        nom: value.nom,
        montant: value.montant,
        categorie_id: value.categorie_id ?? null,
        sous_categorie_id: value.sous_categorie_id ?? null,
        actif: true,
        frequence_mois: value.frequence,
        ordre: charges.length,
        mois_debut: month,
      })
      recurrent_id = recurrent.id
    }
    await createFixed.mutateAsync({
      mois_id: moisId,
      recurrent_id,
      nom: value.nom,
      montant: value.montant,
      categorie_id: value.categorie_id ?? null,
      sous_categorie_id: value.sous_categorie_id ?? null,
      payee: false,
      ordre: charges.length,
    })
    setFixedOpen(false)
  }

  const saveFixed = (id: string, nom: string, montant: number, recurrentId: string | null, categorieId?: string | null, sousCategorieId?: string | null) => {
    if (recurrentId) {
      setScopeFixed({ id, nom, montant, recurrentId, categorieId: categorieId ?? null, sousCategorieId: sousCategorieId ?? null })
    } else {
      updateFixed.mutateAsync({ id, nom, montant, categorie_id: categorieId ?? null, sous_categorie_id: sousCategorieId ?? null })
    }
    setEditFixed(null)
  }

  const saveFixedScope = async (scope: 'mois' | 'tous') => {
    if (!scopeFixed || isAdminViewing) return
    await updateFixed.mutateAsync({
      id: scopeFixed.id,
      nom: scopeFixed.nom,
      montant: scopeFixed.montant,
      categorie_id: scopeFixed.categorieId ?? null,
      sous_categorie_id: scopeFixed.sousCategorieId ?? null,
    })
    if (scope === 'tous') {
      await updateFixedRecurring.mutateAsync({
        id: scopeFixed.recurrentId,
        nom: scopeFixed.nom,
        montant: scopeFixed.montant,
        categorie_id: scopeFixed.categorieId ?? null,
        sous_categorie_id: scopeFixed.sousCategorieId ?? null,
      })
    }
    setScopeFixed(null)
  }

  const removeFixedExpense = (mode: 'mois' | 'definitif') => {
    if (!deleteFixed || isAdminViewing) return
    if (mode === 'definitif' && deleteFixed.recurrentId) removeDefinitif.mutate({ chargeId: deleteFixed.id, recurrentId: deleteFixed.recurrentId })
    else removeFixed.mutate(deleteFixed.id)
    setDeleteFixed(null)
  }

  const editFixedTarget = (charge: any) => setEditFixed({
    id: charge.id,
    nom: charge.nom,
    montant: Number(charge.montant),
    recurrentId: charge.recurrent_id ?? null,
    categorieId: charge.categorie_id ?? null,
    sousCategorieId: charge.sous_categorie_id ?? null,
  })

  const saveSelectedBudget = () => {
    if (!selectedCategory || !moisId || isAdminViewing) return
    upsertBudget.mutate({ mois_id: moisId, categorie_id: selectedCategory.id, prevu: Number(budgetInput) || 0 })
    setEditingBudget(false)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-28 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Dépenses</h1>
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 lg:max-w-sm">
            <Button size="sm" variant={view === 'planned' ? 'default' : 'ghost'} onClick={() => setView('planned')}>
              <CalendarClock className="mr-2 h-4 w-4" />Prévues
            </Button>
            <Button size="sm" variant={view === 'actual' ? 'default' : 'ghost'} onClick={() => setView('actual')}>
              <ReceiptText className="mr-2 h-4 w-4" />Réelles
            </Button>
          </div>
        </div>

        <div className={view === 'planned' ? 'grid gap-3 xl:grid-cols-[1.65fr_.85fr]' : ''}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Aperçu du mois</CardTitle></CardHeader>
            <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-3">
              <SummaryCard label="Dépenses prévues" value={plannedTotal} detail="100 % du mois" tone="blue" />
              <SummaryCard label="Dépenses réelles" value={actualTotal} detail={plannedTotal > 0 ? actualPercent + ' % du prévu' : 'Aucun prévu'} tone="emerald" />
              <SummaryCard label="Écart" value={variance} detail={variance <= 0 ? Math.abs(actualPercent - 100) + ' % sous le budget' : 'Dépassement du prévu'} tone={variance <= 0 ? 'amber' : 'rose'} signed />
            </CardContent>
          </Card>

          {view === 'planned' && (
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Répartition du prévu</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="bg-emerald-400" style={{ width: fixedShare + '%' }} />
                  <div className="bg-orange-400" style={{ width: variableShare + '%' }} />
                  <div className="bg-violet-500" style={{ width: otherShare + '%' }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div><strong className="text-emerald-300">{fixedShare} %</strong><p className="mt-1 text-slate-500">Charges fixes</p></div>
                  <div><strong className="text-orange-300">{variableShare} %</strong><p className="mt-1 text-slate-500">Budgets variables</p></div>
                  <div><strong className="text-violet-300">{otherShare} %</strong><p className="mt-1 text-slate-500">Autres</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {view === 'planned' ? (
          <>
            <div className="grid gap-3 xl:grid-cols-2">
              <Card className="border-slate-800 bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-sm text-slate-200">
                    <span>Dépenses récurrentes <strong className="ml-2 text-slate-100">{formatEuro(plannedFixed)}</strong></span>
                    {!isAdminViewing && moisId && <Button size="sm" onClick={() => setFixedOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Ajouter</Button>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {effectiveCharges.length === 0 ? (
                    <EmptyStateV2 icon={CalendarClock} title="Aucune charge fixe prévue" description="Ajoute les charges que tu souhaites prévoir pour ce mois." actionLabel={!isAdminViewing && moisId ? 'Ajouter une charge fixe' : undefined} onAction={!isAdminViewing && moisId ? () => setFixedOpen(true) : undefined} />
                  ) : (
                    <>
                      <div className="hidden grid-cols-[1.35fr_.65fr_.75fr_.8fr_.55fr_54px] gap-2 border-b border-slate-800 px-2 pb-2 text-[10px] uppercase tracking-wide text-slate-600 md:grid">
                        <span>Nom</span><span className="text-right">Montant</span><span>Récurrence</span><span>Date</span><span>Statut</span><span />
                      </div>
                      <div className="divide-y divide-slate-800/70">
                        {effectiveCharges.map((charge: any) => (
                          <div key={charge.id} className="grid gap-2 px-2 py-2.5 md:grid-cols-[1.35fr_.65fr_.75fr_.8fr_.55fr_54px] md:items-center">
                            <div className="flex min-w-0 items-center gap-2">
                              <span>{charge.categorie_icone || '🏠'}</span>
                              <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{charge.nom}</p>{charge.categorie_nom && <p className="truncate text-[10px] text-slate-600">{charge.categorie_nom}{charge.sous_categorie_nom ? ' · ' + charge.sous_categorie_nom : ''}</p>}</div>
                            </div>
                            <span className="text-sm font-semibold text-slate-100 md:text-right">{formatEuro(Number(charge.montant))}</span>
                            <span className="text-xs text-slate-500">{charge.recurrent_id ? 'Récurrente' : 'Ponctuelle'}</span>
                            <span className="text-xs text-slate-500">{charge.date_prevue ? formatDate(charge.date_prevue) : '—'}</span>
                            <span className={'w-fit rounded-full px-2 py-1 text-[10px] font-medium ' + (charge.payee ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400')}>{charge.payee ? 'Payée' : 'Prévue'}</span>
                            {!isAdminViewing && <div className="flex justify-end gap-1"><button className="p-1 text-slate-600 hover:text-indigo-300" onClick={() => editFixedTarget(charge)}><Pencil className="h-3.5 w-3.5" /></button><button className="p-1 text-slate-700 hover:text-rose-400" onClick={() => setDeleteFixed({ id: charge.id, recurrentId: charge.recurrent_id, nom: charge.nom })}><Trash2 className="h-3.5 w-3.5" /></button></div>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card id="budgets-variables" className="scroll-mt-24 border-slate-800 bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-sm text-slate-200">
                    <span>Budgets variables <strong className="ml-2 text-slate-100">{formatEuro(plannedVariable)}</strong></span>
                    {!isAdminViewing && selectedCategory && <Button size="sm" variant="outline" onClick={() => { setBudgetInput(String(selectedBudget || '')); setEditingBudget(true) }}><Pencil className="mr-1 h-3.5 w-3.5" />Modifier</Button>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {parentCategories.length === 0 ? (
                    <EmptyStateV2 icon={WalletCards} title="Aucune catégorie variable" description="Crée des catégories depuis les paramètres pour préparer tes budgets variables." />
                  ) : (
                    <>
                      <div className="hidden grid-cols-[1.2fr_.58fr_.58fr_.58fr_1fr] gap-2 border-b border-slate-800 px-2 pb-2 text-[10px] uppercase tracking-wide text-slate-600 md:grid">
                        <span>Catégorie</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right">Reste</span><span>Progression</span>
                      </div>
                      <div className="divide-y divide-slate-800/70">
                        {parentCategories.map((cat: any) => {
                          const planned = budget(cat.id)
                          const actual = spent(cat.id)
                          const remaining = planned - actual
                          const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0
                          const selected = selectedCategory?.id === cat.id
                          return (
                            <button key={cat.id} type="button" onClick={() => { setSelectedBudgetId(cat.id); setEditingBudget(false) }} className={'grid w-full gap-2 px-2 py-2.5 text-left transition hover:bg-slate-800/30 md:grid-cols-[1.2fr_.58fr_.58fr_.58fr_1fr] md:items-center ' + (selected ? 'bg-indigo-500/[0.06]' : '')}>
                              <div className="flex min-w-0 items-center gap-2"><span>{cat.icone || '📂'}</span><span className="truncate text-sm font-medium text-slate-200">{cat.nom}</span></div>
                              <span className="text-xs text-slate-300 md:text-right">{formatEuro(planned)}</span>
                              <span className="text-xs text-slate-300 md:text-right">{formatEuro(actual)}</span>
                              <span className={'text-xs font-medium md:text-right ' + (remaining < 0 ? 'text-rose-400' : 'text-emerald-400')}>{formatEuro(remaining)}</span>
                              <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className={'h-full rounded-full ' + (remaining < 0 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: pct + '%' }} /></div><span className="w-8 text-right text-[10px] text-slate-500">{pct}%</span></div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedCategory && (
              <Card className="border-slate-800 bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                    <span className="mr-auto">Détail d’un budget variable</span>
                    <label className="relative">
                      <select value={selectedCategory.id} onChange={event => { setSelectedBudgetId(event.target.value); setEditingBudget(false) }} className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-xs text-slate-200">
                        {parentCategories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    </label>
                    {!isAdminViewing && <Button size="sm" onClick={() => { setBudgetInput(String(selectedBudget || '')); setEditingBudget(true) }}>Modifier le budget</Button>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3 pt-0">
                  <div className="grid gap-3 rounded-xl border border-slate-800/70 bg-slate-950/25 p-3 sm:grid-cols-[1.2fr_.7fr_.7fr_.7fr_1fr] sm:items-center">
                    <div className="flex items-center gap-3"><span className="text-2xl">{selectedCategory.icone || '📂'}</span><span className="font-semibold text-slate-100">{selectedCategory.nom}</span></div>
                    <Metric label="Prévu" value={formatEuro(selectedBudget)} />
                    <Metric label="Réel" value={formatEuro(selectedSpent)} tone="text-emerald-300" />
                    <Metric label="Reste" value={formatEuro(selectedRemaining)} tone={selectedRemaining < 0 ? 'text-rose-300' : 'text-slate-100'} />
                    <div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={'h-full rounded-full ' + (selectedRemaining < 0 ? 'bg-rose-400' : 'bg-emerald-400')} style={{ width: selectedProgress + '%' }} /></div><p className="mt-1 text-right text-[10px] text-slate-500">{selectedProgress}%</p></div>
                  </div>

                  {editingBudget && !isAdminViewing && (
                    <div className="flex items-center gap-2 rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
                      <input type="number" step="0.01" value={budgetInput} onChange={event => setBudgetInput(event.target.value)} className="input input-bordered input-sm flex-1" />
                      <Button size="sm" onClick={saveSelectedBudget}><Check className="mr-1 h-3.5 w-3.5" />Enregistrer</Button>
                    </div>
                  )}

                  <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/40 p-1 sm:w-fit">
                    <Button size="sm" variant={budgetDetailTab === 'subcategories' ? 'default' : 'ghost'} onClick={() => setBudgetDetailTab('subcategories')}>Sous-catégories</Button>
                    <Button size="sm" variant={budgetDetailTab === 'transactions' ? 'default' : 'ghost'} onClick={() => setBudgetDetailTab('transactions')}>Transactions récentes</Button>
                  </div>

                  {budgetDetailTab === 'subcategories' ? (
                    selectedSubcats.length === 0 ? <p className="text-sm text-slate-600">Aucune sous-catégorie pour ce budget.</p> :
                    <div className="overflow-x-auto rounded-xl border border-slate-800/70">
                      <div className="min-w-[620px]">
                        <div className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr_1fr] gap-2 border-b border-slate-800 px-3 py-2 text-[10px] uppercase tracking-wide text-slate-600"><span>Sous-catégorie</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right">Reste</span><span>Progression</span></div>
                        {selectedSubcats.map((sub: any) => {
                          const remaining = sub.planned - sub.actual
                          const pct = sub.planned > 0 ? Math.min(100, Math.round((sub.actual / sub.planned) * 100)) : sub.actual > 0 ? 100 : 0
                          return <div key={sub.id} className="grid grid-cols-[1.2fr_.7fr_.7fr_.7fr_1fr] items-center gap-2 border-b border-slate-800/60 px-3 py-2.5 last:border-0"><span className="text-sm text-slate-200">{sub.icone || '•'} {sub.nom}</span><span className="text-right text-xs">{formatEuro(sub.planned)}</span><span className="text-right text-xs">{formatEuro(sub.actual)}</span><span className={'text-right text-xs ' + (remaining < 0 ? 'text-rose-400' : 'text-emerald-400')}>{formatEuro(remaining)}</span><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: pct + '%' }} /></div><span className="w-8 text-right text-[10px] text-slate-500">{pct}%</span></div></div>
                        })}
                      </div>
                    </div>
                  ) : (
                    selectedTransactions.length === 0 ? <p className="text-sm text-slate-600">Aucune transaction pour ce budget.</p> :
                    <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/70">
                      {selectedTransactions.map((tx: any) => <button key={tx.id} type="button" onClick={() => !isAdminViewing && setEditTx(tx)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/30"><span>{tx.sous_categorie?.icone || tx.categorie?.icone || '📦'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-200">{tx.sous_categorie?.nom || tx.categorie?.nom || 'Sans catégorie'}</p>{tx.infos && <p className="truncate text-[10px] text-slate-600">{tx.infos}</p>}</div><span className="text-xs text-slate-500">{formatDate(tx.date)}</span><strong className="text-sm text-rose-300">{formatEuro(net(tx))}</strong></button>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([
                ['all', 'Toutes'],
                ['upcoming', 'À venir'],
                ['realized', 'Réalisées'],
                ['debited', 'Débitées'],
              ] as const).map(([key, label]) => (
                <Button key={key} size="sm" variant={actualFilter === key ? 'default' : 'outline'} onClick={() => setActualFilter(key)}>{label}</Button>
              ))}
            </div>

            {groupedEntries.length === 0 ? (
              <EmptyStateV2 icon={ReceiptText} title="Aucune dépense dans ce filtre" description="Les dépenses du mois apparaîtront ici selon leur état." actionLabel={!isAdminViewing && moisId ? 'Ajouter une dépense' : undefined} onAction={!isAdminViewing && moisId ? () => setTxOpen(true) : undefined} />
            ) : (
              <div className="space-y-4">
                {groupedEntries.map(([label, entries]) => (
                  <section key={label}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
                    <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/70 bg-slate-900">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 px-3 py-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950/60 text-lg">{entry.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-200">{entry.title}</p><StatusBadge status={entry.status} /></div>
                            <p className="truncate text-[11px] text-slate-500">{entry.subcategory ? entry.subcategory + ' · ' : ''}{entry.source === 'fixed' ? 'Charge fixe' : (entry.info || 'Dépense variable')}</p>
                          </div>
                          <div className="text-right"><strong className={entry.source === 'fixed' ? 'text-purple-300' : 'text-rose-300'}>{formatEuro(entry.amount)}</strong><p className="text-[10px] text-slate-600">{formatDate(entry.date)}</p></div>
                          {!isAdminViewing && <div className="flex shrink-0 items-center gap-1"><button className="p-1 text-slate-600 hover:text-indigo-300" onClick={() => entry.source === 'fixed' ? editFixedTarget(entry.sourceData) : setEditTx(entry.sourceData)}><Pencil className="h-3.5 w-3.5" /></button><button className="p-1 text-slate-700 hover:text-rose-400" onClick={() => entry.source === 'fixed' ? setDeleteFixed({ id: entry.sourceData.id, recurrentId: entry.sourceData.recurrent_id, nom: entry.sourceData.nom }) : setDeleteTx(entry.sourceData)}><Trash2 className="h-3.5 w-3.5" /></button></div>}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {!isAdminViewing && moisId && <DepensesFab onFixed={() => setFixedOpen(true)} onVariable={() => setTxOpen(true)} />}

        <ChargeFixeForm open={fixedOpen} onOpenChange={setFixedOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSubmit={createFixedExpense} />
        <ChargeFixeEditDialog editTarget={editFixed} categories={effectiveCategories} onClose={() => setEditFixed(null)} onSave={saveFixed} />
        <ChargeFixeDeleteDialog target={deleteFixed} onClose={() => setDeleteFixed(null)} onDelete={removeFixedExpense} />
        <ChargeFixeScopeDialog target={scopeFixed} onClose={() => setScopeFixed(null)} onSave={saveFixedScope} />
        <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSubmit={createTransaction} onSubmitSplit={createSplitTransaction} />
        <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSave={async (data:any) => { await updateTx.mutateAsync(data); setEditTx(null) }} onRemb={(tx:any) => { setEditTx(null); setRembTx(tx) }} onSplit={(tx:any) => { setEditTx(null); setSplitTx(tx) }} onUnsplit={async(tx:any) => { await unsplit.mutateAsync(tx.id); setEditTx(null) }} />
        <DepenseDeleteDialog target={deleteTx} onClose={() => setDeleteTx(null)} onDelete={(id:string) => { removeTx.mutate(id); setDeleteTx(null) }} />
        <ArchiveDialog target={archiveTarget} onClose={() => setArchiveTarget(null)} onArchive={(id:string) => { if (!isAdminViewing) archiveCat.mutate(id); setArchiveTarget(null) }} />
        <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSave={async(parentId:string, lines:any[]) => { await split.mutateAsync({ parentId, lines }); setSplitTx(null) }} />
        <RemboursementDialog tx={rembTx} reimbursements={remboursements} onClose={() => setRembTx(null)} onCreate={data => createRemb.mutateAsync(data).then(() => undefined)} onRemove={id => removeRemb.mutateAsync(id)} />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, detail, tone, signed = false }: { label: string; value: number; detail: string; tone: 'blue' | 'emerald' | 'amber' | 'rose'; signed?: boolean }) {
  const styles = {
    blue: 'border-blue-400/20 bg-blue-500/[0.07] text-blue-300',
    emerald: 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-500/[0.07] text-amber-300',
    rose: 'border-rose-400/20 bg-rose-500/[0.07] text-rose-300',
  }
  return <div className={'rounded-xl border p-3 ' + styles[tone]}><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{signed && value > 0 ? '+' : ''}{formatEuro(value)}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div>
}

function Metric({ label, value, tone = 'text-slate-100' }: { label: string; value: string; tone?: string }) {
  return <div><p className="text-[10px] text-slate-600">{label}</p><p className={'mt-1 text-sm font-semibold ' + tone}>{value}</p></div>
}

function StatusBadge({ status }: { status: Exclude<ActualFilter, 'all'> }) {
  if (status === 'upcoming') return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-300"><Clock3 className="mr-1 inline h-2.5 w-2.5" />À venir</span>
  if (status === 'debited') return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">✓ Débitée</span>
  return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-medium text-blue-300">Réalisée</span>
}
