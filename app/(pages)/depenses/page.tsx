'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CalendarClock,
  Check,
  ChartPie,
  ChevronDown,
  Plus,
  ReceiptText,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
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
import RemboursementDialog from '@/components/pages/variables/RemboursementDialog'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'
import EmptyStateV2 from '@/components/ui/EmptyStateV2'
import DepensesFab from '@/components/pages/depenses/DepensesFab'
import CategorieDialog from '@/components/pages/variables/CategorieDialog'

type ActualFilter = 'all' | 'planned' | 'validated'

export default function DepensesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [view, setView] = useState<'planned' | 'actual'>('planned')
  const [actualFilter, setActualFilter] = useState<ActualFilter>('all')
  const [actualSort, setActualSort] = useState<'payment' | 'validation'>('payment')
  const [budgetModalId, setBudgetModalId] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({})
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTx, setDeleteTx] = useState<any>(null)
  const [fixedOpen, setFixedOpen] = useState(false)
  const [editFixed, setEditFixed] = useState<any>(null)
  const [deleteFixed, setDeleteFixed] = useState<any>(null)
  const [scopeFixed, setScopeFixed] = useState<any>(null)
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryDialogParentId, setCategoryDialogParentId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    const requestedActualFilter = params.get('actualFilter')
    if (requestedView === 'planned' || requestedView === 'actual') setView(requestedView)
    if (requestedActualFilter === 'all' || requestedActualFilter === 'planned' || requestedActualFilter === 'validated') {
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

  const { data: categories = [], create: createCat } = useCategories(espace?.id)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: charges = [], togglePayee, create: createFixed, update: updateFixed, remove: removeFixed, removeDefinitif } = useChargesFixes(moisId)
  const { data: fixedRecurrents = [], create: createFixedRecurring, update: updateFixedRecurring } = useChargesFixesRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(rembTx?.id)

  const subcategoriesEnabled = espace?.features?.subcategories !== false
  const splitEnabled = espace?.features?.split_transactions !== false
  const reimbursementsEnabled = espace?.features?.reimbursements !== false

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
  const subCats = (id: string) => subcategoriesEnabled ? effectiveCategories.filter((c: any) => c.parent_id === id && c.actif !== false) : []
  const budget = (id: string) => Number(effectiveBudgets.find((b: any) => b.categorie_id === id)?.prevu || 0)
  const refundTotal = (tx: any) => (tx.remboursements || []).reduce((sum: number, item: any) => sum + Number(item.montant), 0)
  const net = (tx: any) => Number(tx.montant) - refundTotal(tx)
  const spent = (id: string, sub = false) => effectiveFlat.filter((t: any) => (sub ? t.sous_categorie_id : t.categorie_id) === id).reduce((sum: number, t: any) => sum + net(t), 0)

  const parentCategoryIds = new Set(parentCategories.map((c: any) => c.id))
  const parentBudgets = effectiveBudgets.filter((b: any) => parentCategoryIds.has(b.categorie_id))
  const expenseSummary = summarizeAnalyticalExpenses(effectiveCharges, parentBudgets, effectiveFlat)
  const { plannedFixed, actualFixed, plannedVariable, actualVariable, plannedTotal, actualTotal } = expenseSummary
  const variance = actualTotal - plannedTotal
  const actualPercent = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0
  const distributionTotal = view === 'planned' ? plannedTotal : actualTotal
  const distributionFixed = view === 'planned' ? plannedFixed : actualFixed
  const distributionVariable = view === 'planned' ? plannedVariable : actualVariable
  const fixedShare = distributionTotal > 0 ? Math.round((distributionFixed / distributionTotal) * 100) : 0
  const variableShare = distributionTotal > 0 ? Math.max(0, 100 - fixedShare) : 0
  const today = localDateISO()

  const budgetModalCategory = parentCategories.find((cat: any) => cat.id === budgetModalId) || null
  const budgetModalSubcats = budgetModalCategory ? subCats(budgetModalCategory.id) : []
  const budgetModalTransactions = budgetModalCategory
    ? effectiveFlat.filter((tx: any) => tx.categorie_id === budgetModalCategory.id)
    : []
  const subBudgetTotal = budgetModalSubcats.reduce((sum: number, sub: any) => sum + (Number(budgetDraft[sub.id]) || 0), 0)
  const isSubBudgetMode = subBudgetTotal > 0
  const effectiveParentBudgetDraft = isSubBudgetMode
    ? subBudgetTotal
    : (Number(budgetDraft[budgetModalCategory?.id || '']) || 0)

  const recurrenceLabel = (charge: any) => {
    if (!charge.recurrent_id) return 'Ponctuelle'
    const recurrent = fixedRecurrents.find((item: any) => item.id === charge.recurrent_id)
    const frequency = Number(recurrent?.frequence_mois || 1)
    return frequency === 1 ? 'Tous les mois' : 'Tous les ' + frequency + ' mois'
  }

  const openCategoryDialog = (parentId: string | null = null) => {
    setCategoryDialogParentId(parentId)
    setCategoryDialogOpen(true)
  }

  const createBudgetCategory = async (data: { nom: string; icone: string; parent_id?: string }) => {
    if (!espace?.id || isAdminViewing) return
    const created = await createCat.mutateAsync({
      espace_id: espace.id,
      nom: data.nom,
      icone: data.icone,
      couleur: data.parent_id ? '#64748b' : '#6366f1',
      ordre: effectiveCategories.length,
      actif: true,
      parent_id: data.parent_id || null,
    })
    if (!data.parent_id && created?.id && moisId) {
      await upsertBudget.mutateAsync({ mois_id: moisId, categorie_id: created.id, prevu: 0 })
    }
  }

  const openBudgetModal = (categoryId: string) => {
    const category = parentCategories.find((cat: any) => cat.id === categoryId)
    if (!category) return
    const children = subCats(category.id)
    const childTotal = children.reduce((sum: number, sub: any) => sum + budget(sub.id), 0)
    const draft: Record<string, string> = {
      [category.id]: String(childTotal > 0 ? childTotal : (budget(category.id) || '')),
    }
    for (const sub of children) draft[sub.id] = String(budget(sub.id) || '')
    setBudgetDraft(draft)
    setBudgetModalId(categoryId)
  }

  const saveBudgetModal = async () => {
    if (!budgetModalCategory || !moisId || isAdminViewing) return
    for (const sub of budgetModalSubcats) {
      await upsertBudget.mutateAsync({
        mois_id: moisId,
        categorie_id: sub.id,
        prevu: Number(budgetDraft[sub.id]) || 0,
      })
    }
    await upsertBudget.mutateAsync({
      mois_id: moisId,
      categorie_id: budgetModalCategory.id,
      prevu: effectiveParentBudgetDraft,
    })
    setBudgetModalId(null)
  }

  const actualEntries = useMemo(() => {
    const fixedEntries = effectiveCharges.map((charge: any) => {
      const validated = Boolean(charge.payee)
      const paymentDate = charge.date_prevue || charge.date_reelle || month.slice(0, 7) + '-01'
      const validationDate = charge.date_reelle || null
      return {
        id: 'fixed-' + charge.id,
        source: 'fixed' as const,
        sourceData: charge,
        paymentDate,
        validationDate,
        status: validated ? 'validated' as const : 'planned' as const,
        title: charge.nom,
        subcategory: charge.sous_categorie_nom || null,
        icon: charge.categorie_icone || '🏠',
        amount: Number(validated ? (charge.montant_reel ?? charge.montant) : charge.montant),
        grossAmount: Number(validated ? (charge.montant_reel ?? charge.montant) : charge.montant),
        refund: 0,
        info: charge.categorie_nom || 'Charge fixe',
      }
    })

    const transactionEntries = effectiveTransactions.map((tx: any) => {
      const validated = Boolean(tx.date_validation)
      const reimbursement = refundTotal(tx)
      return {
        id: 'tx-' + tx.id,
        source: 'transaction' as const,
        sourceData: tx,
        paymentDate: tx.date,
        validationDate: tx.date_validation || null,
        status: validated ? 'validated' as const : 'planned' as const,
        title: tx.is_split && tx.children?.length ? 'Dépense répartie' : (tx.categorie?.nom || 'Sans catégorie'),
        subcategory: tx.is_split && tx.children?.length
          ? tx.children.map((child: any) => child.categorie?.nom || 'Sans catégorie').filter((name: string, index: number, all: string[]) => all.indexOf(name) === index).join(' · ')
          : (tx.sous_categorie?.nom || null),
        icon: tx.is_split && tx.children?.length ? '✂️' : (tx.categorie?.icone || '📦'),
        amount: net(tx),
        grossAmount: Number(tx.montant),
        refund: reimbursement,
        info: tx.infos || 'Dépense variable',
      }
    })

    return [...fixedEntries, ...transactionEntries]
  }, [effectiveCharges, effectiveTransactions, month])

  const filteredActualEntries = actualEntries.filter(entry => actualFilter === 'all' || entry.status === actualFilter)

  const sortedActualEntries = useMemo(() => {
    return [...filteredActualEntries].sort((a, b) => {
      const aDate = actualSort === 'validation' ? (a.validationDate || a.paymentDate) : a.paymentDate
      const bDate = actualSort === 'validation' ? (b.validationDate || b.paymentDate) : b.paymentDate
      return String(bDate).localeCompare(String(aDate))
    })
  }, [filteredActualEntries, actualSort])

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, typeof sortedActualEntries>()
    const yesterdayDate = new Date(today + 'T12:00:00')
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = localDateISO(yesterdayDate)

    for (const entry of sortedActualEntries) {
      const displayDate = actualSort === 'validation' ? (entry.validationDate || entry.paymentDate) : entry.paymentDate
      const label = displayDate === today ? "Aujourd'hui" : displayDate === yesterday ? 'Hier' : formatDate(displayDate)
      const list = groups.get(label) || []
      list.push(entry)
      groups.set(label, list)
    }
    return Array.from(groups.entries())
  }, [sortedActualEntries, today, actualSort])

  const toggleActualEntry = async (entry: any, checked: boolean) => {
    if (isAdminViewing) return
    if (entry.source === 'fixed') {
      await togglePayee.mutateAsync({ id: entry.sourceData.id, payee: checked, dateReelle: checked ? today : undefined })
      return
    }
    await updateTx.mutateAsync({
      id: entry.sourceData.id,
      date_validation: checked ? today : null,
    })
  }

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

  useEffect(() => {
    if (isAdminViewing) return
    const params = new URLSearchParams(window.location.search)
    const focusTxId = params.get('focus')
    const reimbursementTxId = params.get('reimbursement')
    const focusFixedId = params.get('focusFixed')

    if (focusTxId || reimbursementTxId || focusFixedId) setView('actual')

    if (focusTxId) {
      const transaction = effectiveTransactions.find((item: any) => item.id === focusTxId || item.children?.some((child: any) => child.id === focusTxId))
      if (transaction) setEditTx(transaction)
    }
    if (reimbursementTxId) {
      const transaction = effectiveTransactions.find((item: any) => item.id === reimbursementTxId)
      if (transaction) setRembTx(transaction)
    }
    if (focusFixedId) {
      const charge = effectiveCharges.find((item: any) => item.id === focusFixedId)
      if (charge) editFixedTarget(charge)
    }
  }, [isAdminViewing, effectiveTransactions, effectiveCharges])

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

        <div className="grid gap-3 xl:grid-cols-[1.65fr_.85fr]">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Aperçu du mois</CardTitle></CardHeader>
            <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-3">
              <SummaryCard icon={ChartPie} label="Dépenses prévues" value={plannedTotal} tone="blue" />
              <SummaryCard icon={WalletCards} label="Dépenses réelles" value={actualTotal} detail={plannedTotal > 0 ? actualPercent + ' % du prévu' : 'Aucun prévu'} tone="emerald" />
              <SummaryCard icon={variance <= 0 ? TrendingDown : TrendingUp} label="Écart" value={variance} detail={variance <= 0 ? Math.abs(actualPercent - 100) + ' % sous le budget' : 'Dépassement du prévu'} tone={variance <= 0 ? 'amber' : 'rose'} signed />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200">
                {view === 'planned' ? 'Répartition du prévu' : 'Répartition du réel'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="bg-emerald-400" style={{ width: fixedShare + '%' }} />
                <div className="bg-orange-400" style={{ width: variableShare + '%' }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
                <div>
                  <strong className="text-emerald-300">{fixedShare} %</strong>
                  <p className="mt-1 text-slate-500">Charges fixes</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{formatEuro(distributionFixed)}</p>
                </div>
                <div>
                  <strong className="text-orange-300">{variableShare} %</strong>
                  <p className="mt-1 text-slate-500">{view === 'planned' ? 'Budgets variables' : 'Dépenses variables'}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{formatEuro(distributionVariable)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {view === 'planned' ? (
          <div className="grid gap-3 xl:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span>Dépenses récurrentes <strong className="ml-2 text-blue-300">{formatEuro(plannedFixed)}</strong></span>
                  {!isAdminViewing && moisId && <Button size="sm" onClick={() => setFixedOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Ajouter</Button>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {effectiveCharges.length === 0 ? (
                  <EmptyStateV2 icon={CalendarClock} title="Aucune charge fixe prévue" description="Ajoute les charges que tu souhaites prévoir pour ce mois." />
                ) : (
                  <>
                    <div className="hidden grid-cols-[1.45fr_.7fr_1fr_.65fr_54px] gap-2 border-b border-slate-800 px-2 pb-2 text-[10px] uppercase tracking-wide text-slate-600 md:grid">
                      <span>Nom</span><span className="text-right">Montant</span><span>Récurrence</span><span>Statut</span><span />
                    </div>
                    <div className="divide-y divide-slate-800/70">
                      {effectiveCharges.map((charge: any) => (
                        <div
                          key={charge.id}
                          role={!isAdminViewing ? 'button' : undefined}
                          tabIndex={!isAdminViewing ? 0 : undefined}
                          onClick={() => { if (!isAdminViewing) editFixedTarget(charge) }}
                          onKeyDown={event => { if (!isAdminViewing && (event.key === 'Enter' || event.key === ' ')) editFixedTarget(charge) }}
                          className="grid cursor-pointer gap-2 px-2 py-2.5 transition hover:bg-slate-800/30 md:grid-cols-[1.45fr_.7fr_1fr_.65fr_54px] md:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span>{charge.categorie_icone || '🏠'}</span>
                            <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{charge.nom}</p>{charge.categorie_nom && <p className="truncate text-[10px] text-slate-600">{charge.categorie_nom}{charge.sous_categorie_nom ? ' · ' + charge.sous_categorie_nom : ''}</p>}</div>
                          </div>
                          <span className="text-sm font-semibold text-slate-100 md:text-right">{formatEuro(Number(charge.montant))}</span>
                          <span className="text-xs text-slate-500">{recurrenceLabel(charge)}</span>
                          <span className={'w-fit rounded-full px-2 py-1 text-[10px] font-medium ' + (charge.payee ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400')}>{charge.payee ? 'Validée' : 'Prévue'}</span>
                          {!isAdminViewing && <div className="flex justify-end"><button aria-label="Supprimer" className="p-1 text-slate-700 hover:text-rose-400" onClick={event => { event.stopPropagation(); setDeleteFixed({ id: charge.id, recurrentId: charge.recurrent_id, nom: charge.nom }) }}><Trash2 className="h-3.5 w-3.5" /></button></div>}
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
                  <span>Budgets variables <strong className="ml-2 text-emerald-300">{formatEuro(plannedVariable)}</strong></span>
                  {!isAdminViewing && espace?.id && (
                    <Button size="sm" onClick={() => openCategoryDialog(null)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Ajouter une catégorie
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {parentCategories.length === 0 ? (
                  <EmptyStateV2 icon={WalletCards} title="Aucune catégorie variable" description="Ajoute une catégorie pour commencer à préparer tes budgets variables." />
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
                        return (
                          <button key={cat.id} type="button" onClick={() => openBudgetModal(cat.id)} className="grid w-full gap-2 px-2 py-2.5 text-left transition hover:bg-slate-800/30 md:grid-cols-[1.2fr_.58fr_.58fr_.58fr_1fr] md:items-center">
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
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                  ['all', 'Toutes'],
                  ['planned', 'Prévues'],
                  ['validated', 'Validées'],
                ] as const).map(([key, label]) => (
                  <Button key={key} size="sm" variant={actualFilter === key ? 'default' : 'outline'} onClick={() => setActualFilter(key)}>{label}</Button>
                ))}
              </div>

              <label className="relative ml-auto">
                <select
                  value={actualSort}
                  onChange={event => setActualSort(event.target.value as 'payment' | 'validation')}
                  className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-xs font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400"
                  aria-label="Trier les dépenses"
                >
                  <option value="payment">Date de paiement</option>
                  <option value="validation">Date de validation</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </label>
            </div>

            {groupedEntries.length === 0 ? (
              <EmptyStateV2 icon={ReceiptText} title="Aucune dépense dans ce filtre" description="Les dépenses du mois apparaîtront ici selon leur validation." actionLabel={!isAdminViewing && moisId ? 'Ajouter une dépense' : undefined} onAction={!isAdminViewing && moisId ? () => setTxOpen(true) : undefined} />
            ) : (
              <div className="space-y-4">
                {groupedEntries.map(([label, entries]) => (
                  <section key={label}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
                    <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/70 bg-slate-900">
                      {entries.map((entry: any) => (
                        <div
                          key={entry.id}
                          role={!isAdminViewing ? 'button' : undefined}
                          tabIndex={!isAdminViewing ? 0 : undefined}
                          onClick={() => {
                            if (isAdminViewing) return
                            if (entry.source === 'fixed') editFixedTarget(entry.sourceData)
                            else setEditTx(entry.sourceData)
                          }}
                          onKeyDown={event => {
                            if (isAdminViewing || (event.key !== 'Enter' && event.key !== ' ')) return
                            if (entry.source === 'fixed') editFixedTarget(entry.sourceData)
                            else setEditTx(entry.sourceData)
                          }}
                          className="flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-slate-800/30"
                        >
                          {!isAdminViewing && (
                            <span onClick={event => event.stopPropagation()}>
                              <Checkbox checked={entry.status === 'validated'} onCheckedChange={checked => toggleActualEntry(entry, checked)} />
                            </span>
                          )}
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950/60 text-lg">{entry.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-200">{entry.title}</p>
                              <StatusBadge status={entry.status} />
                              {entry.sourceData?.is_split && entry.sourceData?.children?.length > 0 && (
                                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-300">{entry.sourceData.children.length} répartitions</span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate-500">{entry.subcategory ? entry.subcategory + ' · ' : ''}{entry.info}</p>
                            {entry.refund > 0 && (
                              <p className="mt-1 text-[10px] text-slate-500">
                                {formatEuro(entry.grossAmount)} dépensés · <span className="text-emerald-400">{formatEuro(entry.refund)} remboursés</span> · coût net {formatEuro(entry.amount)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <strong className={entry.source === 'fixed' ? 'text-purple-300' : 'text-rose-300'}>{formatEuro(entry.amount)}</strong>
                            <p className="text-[10px] text-slate-600">{formatDate(actualSort === 'validation' ? (entry.validationDate || entry.paymentDate) : entry.paymentDate)}</p>
                          </div>
                          {!isAdminViewing && (
                            <button
                              className="shrink-0 p-1 text-slate-700 hover:text-rose-400"
                              aria-label="Supprimer"
                              onClick={event => {
                                event.stopPropagation()
                                if (entry.source === 'fixed') setDeleteFixed({ id: entry.sourceData.id, recurrentId: entry.sourceData.recurrent_id, nom: entry.sourceData.nom })
                                else setDeleteTx(entry.sourceData)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        <Dialog open={!!budgetModalCategory} onOpenChange={open => { if (!open) setBudgetModalId(null) }}>
          <DialogContent className="max-w-3xl border-slate-700 bg-slate-900">
            {budgetModalCategory && (
              <>
                <DialogHeader>
                  <DialogTitle>{budgetModalCategory.icone || '📂'} {budgetModalCategory.nom}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                  <section className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-500">{isSubBudgetMode ? 'Budget total calculé' : 'Budget prévu'}</label>
                      {isSubBudgetMode && <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-300">Somme des sous-budgets</span>}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={isSubBudgetMode ? String(subBudgetTotal) : (budgetDraft[budgetModalCategory.id] ?? '')}
                      onChange={event => setBudgetDraft(prev => ({ ...prev, [budgetModalCategory.id]: event.target.value }))}
                      className="input input-bordered input-sm mt-1 w-full disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isAdminViewing || isSubBudgetMode}
                    />
                    {isSubBudgetMode && <p className="mt-1.5 text-[11px] leading-4 text-slate-600">Le budget principal est calculé automatiquement dès qu’un budget est défini sur une sous-catégorie. Remettez les sous-budgets à 0 pour revenir à un budget global.</p>}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <Metric label="Dépensé" value={formatEuro(spent(budgetModalCategory.id))} />
                      <Metric label="Reste" value={formatEuro(effectiveParentBudgetDraft - spent(budgetModalCategory.id))} />
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-200">Sous-catégories</h3>
                      {!isAdminViewing && subcategoriesEnabled && (
                        <Button size="sm" variant="outline" onClick={() => openCategoryDialog(budgetModalCategory.id)}>
                          <Plus className="mr-1 h-3.5 w-3.5" />Ajouter une sous-catégorie
                        </Button>
                      )}
                    </div>
                    {budgetModalSubcats.length === 0 ? <p className="text-xs text-slate-600">Aucune sous-catégorie.</p> : (
                      <div className="space-y-2">
                        {budgetModalSubcats.map((sub: any) => (
                          <div key={sub.id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/25 p-3 sm:grid-cols-[1fr_150px_110px] sm:items-center">
                            <div><p className="text-sm text-slate-200">{sub.icone || '•'} {sub.nom}</p><p className="text-[10px] text-slate-600">{formatEuro(spent(sub.id, true))} dépensés</p></div>
                            <input type="number" step="0.01" value={budgetDraft[sub.id] ?? ''} onChange={event => setBudgetDraft(prev => ({ ...prev, [sub.id]: event.target.value }))} className="input input-bordered input-sm w-full" disabled={isAdminViewing} />
                            <p className="text-right text-xs text-slate-500">Reste {formatEuro((Number(budgetDraft[sub.id]) || 0) - spent(sub.id, true))}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-slate-200">Transactions du mois</h3>
                    {budgetModalTransactions.length === 0 ? <p className="text-xs text-slate-600">Aucune transaction liée ce mois.</p> : (
                      <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/70">
                        {budgetModalTransactions.map((tx: any) => (
                          <button key={tx.id} type="button" onClick={() => { if (!isAdminViewing) { setBudgetModalId(null); setEditTx(tx) } }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/30">
                            <span>{tx.sous_categorie?.icone || tx.categorie?.icone || '📦'}</span>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-200">{tx.sous_categorie?.nom || tx.categorie?.nom || 'Sans catégorie'}</p>{tx.infos && <p className="truncate text-[10px] text-slate-600">{tx.infos}</p>}</div>
                            <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
                            <div className="text-right"><strong className="text-sm text-rose-300">{formatEuro(net(tx))}</strong>{refundTotal(tx) > 0 && <p className="text-[10px] text-slate-500 line-through">{formatEuro(Number(tx.montant))}</p>}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <Button variant="ghost" onClick={() => setBudgetModalId(null)}>Annuler</Button>
                  {!isAdminViewing && <Button onClick={saveBudgetModal} disabled={upsertBudget.isPending}><Check className="mr-1 h-4 w-4" />Enregistrer</Button>}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <CategorieDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          categories={effectiveCategories}
          initialParentId={categoryDialogParentId}
          lockParent={categoryDialogParentId !== null}
          onCreate={createBudgetCategory}
        />

        {!isAdminViewing && moisId && <DepensesFab onFixed={() => setFixedOpen(true)} onVariable={() => setTxOpen(true)} />}

        <ChargeFixeForm open={fixedOpen} onOpenChange={setFixedOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSubmit={createFixedExpense} />
        <ChargeFixeEditDialog editTarget={editFixed} categories={effectiveCategories} onClose={() => setEditFixed(null)} onSave={saveFixed} />
        <ChargeFixeDeleteDialog target={deleteFixed} onClose={() => setDeleteFixed(null)} onDelete={removeFixedExpense} />
        <ChargeFixeScopeDialog target={scopeFixed} onClose={() => setScopeFixed(null)} onSave={saveFixedScope} />
        <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} subcategoriesEnabled={subcategoriesEnabled} splitEnabled={splitEnabled} onSubmit={createTransaction} onSubmitSplit={splitEnabled ? createSplitTransaction : undefined} />
        <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} subcategoriesEnabled={subcategoriesEnabled} onSave={async (data:any) => { await updateTx.mutateAsync(data); setEditTx(null) }} onRemb={reimbursementsEnabled ? ((tx:any) => { setEditTx(null); setRembTx(tx) }) : undefined} onSplit={splitEnabled ? ((tx:any) => { setEditTx(null); setSplitTx(tx) }) : undefined} onUnsplit={splitEnabled ? (async(tx:any) => { await unsplit.mutateAsync(tx.id); setEditTx(null) }) : undefined} />
        <DepenseDeleteDialog target={deleteTx} onClose={() => setDeleteTx(null)} onDelete={(id:string) => { removeTx.mutate(id); setDeleteTx(null) }} />
        {splitEnabled && <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSave={async(parentId:string, lines:any[]) => { await split.mutateAsync({ parentId, lines }); setSplitTx(null) }} />}
        {reimbursementsEnabled && <RemboursementDialog tx={rembTx} reimbursements={remboursements} onClose={() => setRembTx(null)} onCreate={data => createRemb.mutateAsync(data).then(() => undefined)} onRemove={id => removeRemb.mutateAsync(id)} />}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, detail, tone, signed = false }: { icon: any; label: string; value: number; detail?: string; tone: 'blue' | 'emerald' | 'amber' | 'rose'; signed?: boolean }) {
  const styles = {
    blue: 'border-blue-400/20 bg-blue-500/[0.07] text-blue-300',
    emerald: 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-500/[0.07] text-amber-300',
    rose: 'border-rose-400/20 bg-rose-500/[0.07] text-rose-300',
  }
  return (
    <div className={'flex items-center gap-3 rounded-xl border p-3 ' + styles[tone]}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-current/10"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-0.5 text-xl font-bold">{signed && value > 0 ? '+' : ''}{formatEuro(value)}</p>{detail && <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] text-slate-600">{label}</p><p className="mt-1 text-sm font-semibold text-slate-200">{value}</p></div>
}

function StatusBadge({ status }: { status: 'planned' | 'validated' }) {
  return status === 'validated'
    ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">✓ Validée</span>
    : <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-300">Prévue</span>
}
