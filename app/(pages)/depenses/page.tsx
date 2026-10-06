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
  Archive,
  Check,
  ChartPie,
  ChevronDown,
  Plus,
  ReceiptText,
  RotateCcw,
  Settings2,
  Tags,
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
  const [managementView, setManagementView] = useState<'fixed' | 'budgets' | null>(null)
  const [showArchivedFixed, setShowArchivedFixed] = useState(false)
  const [showArchivedCategories, setShowArchivedCategories] = useState(false)
  const [selectedFixedRecurringId, setSelectedFixedRecurringId] = useState<string | null>(null)
  const [actualFilter, setActualFilter] = useState<ActualFilter>('all')
  const [actualSort, setActualSort] = useState<'payment' | 'validation'>('payment')
  const [budgetModalId, setBudgetModalId] = useState<string | null>(null)
  const [budgetModalSubcategoryId, setBudgetModalSubcategoryId] = useState<string | null>(null)
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
    if (requestedView === 'planned') setManagementView('budgets')
    if (requestedActualFilter === 'all' || requestedActualFilter === 'planned' || requestedActualFilter === 'validated') {
      setActualFilter(requestedActualFilter)
    }
  }, [])

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const add = new URLSearchParams(window.location.search).get('add')
    if (add === 'fixed') setFixedOpen(true)
    if (add === 'variable') setTxOpen(true)
  }, [isAdminViewing, moisId])

  const { data: categories = [], create: createCat, update: updateCat, remove: archiveCat } = useCategories(espace?.id)
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
  const archivedParentCategories = effectiveCategories.filter((c: any) => c.actif === false && !c.parent_id)
  const subCats = (id: string, includeArchived = false) => subcategoriesEnabled ? effectiveCategories.filter((c: any) => c.parent_id === id && (includeArchived || c.actif !== false)) : []
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
  const plannedFixedShare = plannedTotal > 0 ? Math.round((plannedFixed / plannedTotal) * 100) : 0
  const plannedVariableShare = plannedTotal > 0 ? Math.max(0, 100 - plannedFixedShare) : 0
  const actualFixedShare = actualTotal > 0 ? Math.round((actualFixed / actualTotal) * 100) : 0
  const actualVariableShare = actualTotal > 0 ? Math.max(0, 100 - actualFixedShare) : 0
  const today = localDateISO()

  const budgetModalCategory = parentCategories.find((cat: any) => cat.id === budgetModalId) || null
  const budgetModalSubcats = budgetModalCategory ? subCats(budgetModalCategory.id) : []
  const budgetModalTransactions = budgetModalCategory
    ? effectiveFlat.filter((tx: any) => tx.categorie_id === budgetModalCategory.id && (!budgetModalSubcategoryId || tx.sous_categorie_id === budgetModalSubcategoryId))
    : []
  const budgetModalSubcategory = budgetModalSubcategoryId
    ? effectiveCategories.find((cat: any) => cat.id === budgetModalSubcategoryId) || null
    : null
  const activeFixedRecurrents = fixedRecurrents.filter((item: any) => item.actif !== false)
  const archivedFixedRecurrents = fixedRecurrents.filter((item: any) => item.actif === false)
  const selectedFixedRecurring = fixedRecurrents.find((item: any) => item.id === selectedFixedRecurringId) || null
  const selectedFixedOccurrence = selectedFixedRecurring
    ? effectiveCharges.find((item: any) => item.recurrent_id === selectedFixedRecurring.id) || null
    : null
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

  const openBudgetModal = (categoryId: string, subcategoryId: string | null = null) => {
    const category = parentCategories.find((cat: any) => cat.id === categoryId)
    if (!category) return
    const children = subCats(category.id)
    const childTotal = children.reduce((sum: number, sub: any) => sum + budget(sub.id), 0)
    const draft: Record<string, string> = {
      [category.id]: String(childTotal > 0 ? childTotal : (budget(category.id) || '')),
    }
    for (const sub of children) draft[sub.id] = String(budget(sub.id) || '')
    setBudgetDraft(draft)
    setBudgetModalSubcategoryId(subcategoryId)
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
    setBudgetModalSubcategoryId(null)
  }

  const fixedFrequencyLabel = (recurring: any) => {
    const frequency = Number(recurring?.frequence_mois || 1)
    return frequency === 1 ? 'Tous les mois' : 'Tous les ' + frequency + ' mois'
  }

  const addCurrentFixedOccurrence = async () => {
    if (!selectedFixedRecurring || !moisId || isAdminViewing || selectedFixedOccurrence) return
    await createFixed.mutateAsync({
      mois_id: moisId,
      recurrent_id: selectedFixedRecurring.id,
      nom: selectedFixedRecurring.nom,
      montant: Number(selectedFixedRecurring.montant),
      categorie_id: selectedFixedRecurring.categorie_id ?? null,
      sous_categorie_id: selectedFixedRecurring.sous_categorie_id ?? null,
      payee: false,
      ordre: charges.length,
    })
  }

  const removeCurrentFixedOccurrence = async () => {
    if (!selectedFixedOccurrence || isAdminViewing) return
    await removeFixed.mutateAsync(selectedFixedOccurrence.id)
  }

  const setFixedRecurringActive = async (id: string, active: boolean) => {
    if (isAdminViewing) return
    await updateFixedRecurring.mutateAsync({ id, actif: active })
    if (!active && selectedFixedRecurringId === id) setSelectedFixedRecurringId(null)
  }

  const setCategoryActive = async (id: string, active: boolean) => {
    if (isAdminViewing) return
    if (active) await updateCat.mutateAsync({ id, actif: true })
    else await archiveCat.mutateAsync(id)
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

  const saveFixed = (
    id: string,
    nom: string,
    montant: number,
    recurrentId: string | null,
    categorieId?: string | null,
    sousCategorieId?: string | null,
    payee?: boolean,
    dateReelle?: string | null,
  ) => {
    if (recurrentId) {
      setScopeFixed({
        id,
        nom,
        montant,
        recurrentId,
        categorieId: categorieId ?? null,
        sousCategorieId: sousCategorieId ?? null,
        payee: !!payee,
        dateReelle: dateReelle ?? null,
      })
    } else {
      updateFixed.mutateAsync({
        id,
        nom,
        montant,
        categorie_id: categorieId ?? null,
        sous_categorie_id: sousCategorieId ?? null,
        payee: !!payee,
        date_reelle: dateReelle ?? null,
      })
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
      payee: !!scopeFixed.payee,
      date_reelle: scopeFixed.dateReelle ?? null,
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
    payee: !!charge.payee,
    dateReelle: charge.date_reelle ?? null,
  })

  useEffect(() => {
    if (isAdminViewing) return
    const params = new URLSearchParams(window.location.search)
    const focusTxId = params.get('focus')
    const reimbursementTxId = params.get('reimbursement')
    const focusFixedId = params.get('focusFixed')

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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Dépenses</h1>
          {!isAdminViewing && moisId && (
            <div className="hidden items-center gap-2 md:flex">
              <Button size="sm" variant="outline" onClick={() => setFixedOpen(true)}>
                <CalendarClock className="mr-1.5 h-3.5 w-3.5" />Charge fixe
              </Button>
              <Button size="sm" onClick={() => setTxOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Dépense variable
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Prévu vs réel</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-3 pt-0">
              <div className="grid gap-2 sm:grid-cols-3">
                <SummaryCard icon={ChartPie} label="Prévu ce mois" value={plannedTotal} tone="blue" />
                <SummaryCard icon={WalletCards} label="Réel" value={actualTotal} detail={plannedTotal > 0 ? actualPercent + ' % du prévu' : 'Aucun prévu'} tone="emerald" />
                <SummaryCard icon={variance <= 0 ? TrendingDown : TrendingUp} label="Écart" value={variance} detail={variance <= 0 ? formatEuro(Math.abs(variance)) + ' restant' : 'Dépassement'} tone={variance <= 0 ? 'amber' : 'rose'} signed />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Avancement du budget</span><strong className="text-slate-300">{actualPercent} %</strong>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div className={actualPercent > 100 ? 'h-full rounded-full bg-rose-400' : 'h-full rounded-full bg-emerald-400'} style={{ width: Math.min(100, actualPercent) + '%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Composition des dépenses</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-3 pt-0">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500"><span>Prévu</span><span>{formatEuro(plannedTotal)}</span></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="bg-purple-400" style={{ width: plannedFixedShare + '%' }} />
                  <div className="bg-orange-400" style={{ width: plannedVariableShare + '%' }} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500"><span>Réel</span><span>{formatEuro(actualTotal)}</span></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="bg-purple-400" style={{ width: actualFixedShare + '%' }} />
                  <div className="bg-orange-400" style={{ width: actualVariableShare + '%' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-purple-400" />Charges fixes</span>
                <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-orange-400" />Dépenses variables</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-auto justify-start gap-3 border-slate-800 bg-slate-900 px-4 py-3" onClick={() => setManagementView('fixed')}>
            <Settings2 className="h-5 w-5 text-purple-300" />
            <span className="text-left"><strong className="block text-sm text-slate-200">Gérer les charges fixes</strong><span className="text-[11px] text-slate-500">Récurrences, occurrences et archives</span></span>
          </Button>
          <Button variant="outline" className="h-auto justify-start gap-3 border-slate-800 bg-slate-900 px-4 py-3" onClick={() => setManagementView('budgets')}>
            <Tags className="h-5 w-5 text-orange-300" />
            <span className="text-left"><strong className="block text-sm text-slate-200">Catégories & budgets</strong><span className="text-[11px] text-slate-500">Budgets, sous-catégories et dépenses du mois</span></span>
          </Button>
        </div>


            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                  ['all', 'Toutes'],
                  ['planned', 'À valider'],
                  ['validated', 'Validées'],
                ] as const).map(([key, label]) => (
                  <Button key={key} size="sm" variant={actualFilter === key ? 'default' : 'outline'} onClick={() => setActualFilter(key)}>{label}</Button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <label className="relative">
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


        <Dialog open={managementView === 'fixed'} onOpenChange={open => { if (!open) { setManagementView(null); setSelectedFixedRecurringId(null) } }}>
          <DialogContent className="max-w-4xl border-slate-700 bg-slate-900">
            <DialogHeader><DialogTitle>Gestion des charges fixes</DialogTitle></DialogHeader>
            <div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1 md:grid-cols-[1fr_1.05fr]">
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{showArchivedFixed ? 'Charges archivées' : 'Charges actives'}</p>
                    <p className="text-[11px] text-slate-500">{showArchivedFixed ? archivedFixedRecurrents.length : activeFixedRecurrents.length} charge(s)</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setShowArchivedFixed(value => !value); setSelectedFixedRecurringId(null) }}>
                    {showArchivedFixed ? <RotateCcw className="mr-1 h-3.5 w-3.5" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
                    {showArchivedFixed ? 'Voir les actives' : 'Voir les archivées'}
                  </Button>
                </div>
                <div className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800">
                  {(showArchivedFixed ? archivedFixedRecurrents : activeFixedRecurrents).length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Aucune charge dans cette liste.</p>
                  ) : (showArchivedFixed ? archivedFixedRecurrents : activeFixedRecurrents).map((recurring: any) => {
                    const cat = effectiveCategories.find((item: any) => item.id === recurring.categorie_id)
                    return (
                      <button key={recurring.id} type="button" onClick={() => setSelectedFixedRecurringId(recurring.id)} className={'flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-800/40 ' + (selectedFixedRecurringId === recurring.id ? 'bg-slate-800/50' : '')}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/60">{cat?.icone || '🏠'}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{recurring.nom}</p><p className="text-[10px] text-slate-500">{fixedFrequencyLabel(recurring)}</p></div>
                        <strong className="text-sm text-purple-300">{formatEuro(Number(recurring.montant))}</strong>
                      </button>
                    )
                  })}
                </div>
                {!isAdminViewing && !showArchivedFixed && (
                  <Button className="mt-3 w-full" onClick={() => { setManagementView(null); setFixedOpen(true) }}><Plus className="mr-1 h-4 w-4" />Ajouter une charge fixe</Button>
                )}
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                {!selectedFixedRecurring ? (
                  <div className="flex min-h-48 items-center justify-center text-center text-sm text-slate-500">Sélectionne une charge fixe pour gérer sa récurrence.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-semibold text-slate-100">{selectedFixedRecurring.nom}</h3><p className="mt-1 text-xs text-slate-500">{fixedFrequencyLabel(selectedFixedRecurring)} · depuis {selectedFixedRecurring.mois_debut ? formatDate(selectedFixedRecurring.mois_debut) : 'date non renseignée'}</p></div>
                      <strong className="text-purple-300">{formatEuro(Number(selectedFixedRecurring.montant))}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-800 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-600">Occurrence du mois affiché</p>
                      {selectedFixedOccurrence ? (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div><p className="text-sm text-slate-200">{selectedFixedOccurrence.payee ? 'Validée' : 'À valider'}</p><p className="text-[10px] text-slate-500">{selectedFixedOccurrence.date_prevue ? formatDate(selectedFixedOccurrence.date_prevue) : 'Date non renseignée'}</p></div>
                          {!isAdminViewing && <Button size="sm" variant="outline" onClick={removeCurrentFixedOccurrence}>Retirer ce mois</Button>}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-sm text-slate-500">Aucune occurrence sur ce mois.</p>{!isAdminViewing && selectedFixedRecurring.actif !== false && <Button size="sm" onClick={addCurrentFixedOccurrence}><Plus className="mr-1 h-3.5 w-3.5" />Ajouter ce mois</Button>}</div>
                      )}
                    </div>
                    {!isAdminViewing && (
                      selectedFixedRecurring.actif === false
                        ? <Button className="w-full" onClick={() => setFixedRecurringActive(selectedFixedRecurring.id, true)}><RotateCcw className="mr-1 h-4 w-4" />Désarchiver la charge</Button>
                        : <Button className="w-full" variant="outline" onClick={() => setFixedRecurringActive(selectedFixedRecurring.id, false)}><Archive className="mr-1 h-4 w-4" />Archiver la charge</Button>
                    )}
                    <p className="text-[10px] leading-4 text-slate-600">Archiver conserve les occurrences déjà créées et retire cette charge des récurrences actives pour les prochains mois.</p>
                  </div>
                )}
              </section>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={managementView === 'budgets'} onOpenChange={open => { if (!open) setManagementView(null) }}>
          <DialogContent className="max-w-4xl border-slate-700 bg-slate-900">
            <DialogHeader><DialogTitle>Catégories & budgets</DialogTitle></DialogHeader>
            <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Clique sur une catégorie ou sous-catégorie pour voir son budget et les dépenses du mois.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowArchivedCategories(value => !value)}>
                    {showArchivedCategories ? <RotateCcw className="mr-1 h-3.5 w-3.5" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
                    {showArchivedCategories ? 'Voir les actives' : 'Voir les archivées'}
                  </Button>
                  {!isAdminViewing && !showArchivedCategories && <Button size="sm" onClick={() => openCategoryDialog(null)}><Plus className="mr-1 h-3.5 w-3.5" />Catégorie</Button>}
                </div>
              </div>
              {(showArchivedCategories ? archivedParentCategories : parentCategories).length === 0 ? (
                <EmptyStateV2 icon={Tags} title={showArchivedCategories ? 'Aucune catégorie archivée' : 'Aucune catégorie'} description={showArchivedCategories ? 'Les catégories archivées apparaîtront ici.' : 'Crée une catégorie pour organiser tes budgets variables.'} />
              ) : (
                <div className="space-y-2">
                  {(showArchivedCategories ? archivedParentCategories : parentCategories).map((cat: any) => {
                    const children = subCats(cat.id, showArchivedCategories).filter((sub: any) => showArchivedCategories ? sub.actif === false : sub.actif !== false)
                    const planned = budget(cat.id)
                    const actual = spent(cat.id)
                    return (
                      <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20">
                        <div className="flex items-center gap-2 p-3">
                          <button type="button" onClick={() => { if (!showArchivedCategories) { setManagementView(null); openBudgetModal(cat.id) } }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="text-xl">{cat.icone || '📂'}</span>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{cat.nom}</p><p className="text-[10px] text-slate-500">{formatEuro(planned)} prévu · {formatEuro(actual)} réel</p></div>
                          </button>
                          {!isAdminViewing && !showArchivedCategories && <Button size="sm" variant="ghost" onClick={() => openCategoryDialog(cat.id)}><Plus className="mr-1 h-3.5 w-3.5" />Sous-cat.</Button>}
                          {!isAdminViewing && (
                            showArchivedCategories
                              ? <button className="p-2 text-slate-500 hover:text-emerald-300" aria-label="Désarchiver" onClick={() => setCategoryActive(cat.id, true)}><RotateCcw className="h-4 w-4" /></button>
                              : <button className="p-2 text-slate-600 hover:text-amber-300" aria-label="Archiver" onClick={() => setCategoryActive(cat.id, false)}><Archive className="h-4 w-4" /></button>
                          )}
                        </div>
                        {children.length > 0 && <div className="border-t border-slate-800/70 px-3 py-2">
                          {children.map((sub: any) => (
                            <div key={sub.id} className="flex items-center gap-2 py-1.5 pl-8">
                              <button type="button" onClick={() => { if (!showArchivedCategories) { setManagementView(null); openBudgetModal(cat.id, sub.id) } }} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                                <span className="truncate text-xs text-slate-300">{sub.icone || '•'} {sub.nom}</span>
                                <span className="text-[10px] text-slate-500">{formatEuro(budget(sub.id))} · {formatEuro(spent(sub.id, true))}</span>
                              </button>
                              {!isAdminViewing && (
                                showArchivedCategories
                                  ? <button className="p-1.5 text-slate-600 hover:text-emerald-300" aria-label="Désarchiver" onClick={() => setCategoryActive(sub.id, true)}><RotateCcw className="h-3.5 w-3.5" /></button>
                                  : <button className="p-1.5 text-slate-700 hover:text-amber-300" aria-label="Archiver" onClick={() => setCategoryActive(sub.id, false)}><Archive className="h-3.5 w-3.5" /></button>
                              )}
                            </div>
                          ))}
                        </div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!budgetModalCategory} onOpenChange={open => { if (!open) { setBudgetModalId(null); setBudgetModalSubcategoryId(null) } }}>
          <DialogContent className="max-w-3xl border-slate-700 bg-slate-900">
            {budgetModalCategory && (
              <>
                <DialogHeader>
                  <DialogTitle>{budgetModalCategory.icone || '📂'} {budgetModalCategory.nom}{budgetModalSubcategory ? ' · ' + budgetModalSubcategory.nom : ''}</DialogTitle>
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
                          <div key={sub.id} className={'grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_150px_110px] sm:items-center ' + (budgetModalSubcategoryId === sub.id ? 'border-indigo-400/40 bg-indigo-500/5' : 'border-slate-800 bg-slate-950/25')}>
                            <button type="button" onClick={() => setBudgetModalSubcategoryId(current => current === sub.id ? null : sub.id)} className="text-left"><p className="text-sm text-slate-200">{sub.icone || '•'} {sub.nom}</p><p className="text-[10px] text-slate-600">{formatEuro(spent(sub.id, true))} dépensés · cliquer pour filtrer</p></button>
                            <input type="number" step="0.01" value={budgetDraft[sub.id] ?? ''} onChange={event => setBudgetDraft(prev => ({ ...prev, [sub.id]: event.target.value }))} className="input input-bordered input-sm w-full" disabled={isAdminViewing} />
                            <p className="text-right text-xs text-slate-500">Reste {formatEuro((Number(budgetDraft[sub.id]) || 0) - spent(sub.id, true))}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-200">Dépenses du mois{budgetModalSubcategory ? ' · ' + budgetModalSubcategory.nom : ''}</h3>{budgetModalSubcategory && <Button size="sm" variant="ghost" onClick={() => setBudgetModalSubcategoryId(null)}>Voir toute la catégorie</Button>}</div>
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
                  <Button variant="ghost" onClick={() => { setBudgetModalId(null); setBudgetModalSubcategoryId(null) }}>Annuler</Button>
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
        <ChargeFixeEditDialog editTarget={editFixed} categories={effectiveCategories} doubleDate={espace?.double_date ?? false} onClose={() => setEditFixed(null)} onSave={saveFixed} />
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