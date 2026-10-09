'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CalendarClock,
  Archive,
  CalendarDays,
  Check,
  ChartPie,
  ChevronDown,
  Info,
  Plus,
  ReceiptText,
  RotateCcw,
  Settings2,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react'
import { formatDate, formatEuro, localDateISO, plannedDateForMonth } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useChargeFixeOccurrences, useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
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
import { EmojiPicker } from '@/components/ui/emoji-picker'
import PlannedExpenseValidationPanel from '@/components/pages/depenses/PlannedExpenseValidationPanel'

type ActualFilter = 'all' | 'planned' | 'validated'
type CategorySort = 'az' | 'planned' | 'actual' | 'remaining'

export default function DepensesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [managementView, setManagementView] = useState<'fixed' | 'budgets' | null>(null)
  const [showArchivedFixed, setShowArchivedFixed] = useState(false)
  const [fixedHelp, setFixedHelp] = useState<string | null>(null)
  const [showArchivedCategories, setShowArchivedCategories] = useState(false)
  const [selectedFixedRecurringId, setSelectedFixedRecurringId] = useState<string | null>(null)
  const [occurrenceMonth, setOccurrenceMonth] = useState(month.slice(0, 7))
  const [suspensionFrom, setSuspensionFrom] = useState('')
  const [suspensionUntil, setSuspensionUntil] = useState('')
  const [actualFilter, setActualFilter] = useState<ActualFilter>('all')
  const [actualSort, setActualSort] = useState<'payment' | 'validation'>('payment')
  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null)
  const [browseSubcategoryId, setBrowseSubcategoryId] = useState<string | null>(null)
  const [categorySort, setCategorySort] = useState<CategorySort>('az')
  const [budgetModalId, setBudgetModalId] = useState<string | null>(null)
  const [budgetModalSubcategoryId, setBudgetModalSubcategoryId] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({})
  const [budgetNameDraft, setBudgetNameDraft] = useState('')
  const [budgetIconDraft, setBudgetIconDraft] = useState('📂')
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTx, setDeleteTx] = useState<any>(null)
  const [fixedOpen, setFixedOpen] = useState(false)
  const [editFixed, setEditFixed] = useState<any>(null)
  const [deleteFixed, setDeleteFixed] = useState<any>(null)
  const [scopeFixed, setScopeFixed] = useState<any>(null)
  const [validationEntry, setValidationEntry] = useState<any>(null)
  const [validationDate, setValidationDate] = useState('')
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryDialogParentId, setCategoryDialogParentId] = useState<string | null>(null)
  const [moveCategoryId, setMoveCategoryId] = useState<string | null>(null)
  const [moveParentId, setMoveParentId] = useState('')
  const [moveError, setMoveError] = useState('')
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeDestinationId, setMergeDestinationId] = useState('')
  const [mergeBudgetRule, setMergeBudgetRule] = useState<'destination'|'sum'|'max'>('destination')
  const [mergePreview, setMergePreview] = useState<{transactions:number;fixed_expenses:number;recurrences:number;monthly_budgets:number;budget_templates:number;children:number}|null>(null)
  const [mergeError, setMergeError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    const requestedActualFilter = params.get('actualFilter')
    const savedSort = window.localStorage.getItem('depenses_actual_sort')
    const savedCategorySort = window.localStorage.getItem('depenses_category_sort')
    if (requestedView === 'planned') setManagementView('budgets')
    if (requestedActualFilter === 'all' || requestedActualFilter === 'planned' || requestedActualFilter === 'validated') {
      setActualFilter(requestedActualFilter)
    }
    if (savedSort === 'payment' || savedSort === 'validation') setActualSort(savedSort)
    if (savedCategorySort === 'az' || savedCategorySort === 'planned' || savedCategorySort === 'actual' || savedCategorySort === 'remaining') setCategorySort(savedCategorySort)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('depenses_actual_sort', actualSort)
  }, [actualSort])

  useEffect(() => {
    window.localStorage.setItem('depenses_category_sort', categorySort)
  }, [categorySort])

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const add = new URLSearchParams(window.location.search).get('add')
    if (add === 'fixed') setFixedOpen(true)
    if (add === 'variable') setTxOpen(true)
  }, [isAdminViewing, moisId])

  const { data: categories = [], create: createCat, update: updateCat, move: moveCat, merge: mergeCat, remove: archiveCat } = useCategories(espace?.id)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: charges = [], togglePayee, create: createFixed, update: updateFixed, remove: removeFixed, removeDefinitif } = useChargesFixes(moisId)
  const { data: fixedRecurrents = [], create: createFixedRecurring, update: updateFixedRecurring } = useChargesFixesRecurrentes(espace?.id)
  const { data: selectedOccurrences = [], add: addOccurrence, remove: removeOccurrence, updateScope: updateOccurrenceScope } = useChargeFixeOccurrences(selectedFixedRecurringId, espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const { data: remboursements = [], create: createRemb, update: updateRemb, remove: removeRemb } = useRemboursements(rembTx?.id)

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

  useEffect(() => {
    if (isAdminViewing) return

    const params = new URLSearchParams(window.location.search)
    const focusTransaction = params.get('focusTransaction')
    const focusFixed = params.get('focusFixed')

    if (focusTransaction) {
      const transaction = effectiveFlat.find((item:any) => String(item.id) === focusTransaction)
        || effectiveTransactions.find((item:any) => String(item.id) === focusTransaction)
      if (transaction) {
        setEditTx(transaction)
        params.delete('focusTransaction')
        const next = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (next ? '?' + next : ''))
      }
    } else if (focusFixed) {
      const charge = effectiveCharges.find((item:any) => String(item.id) === focusFixed)
      if (charge) {
        setEditFixed(charge)
        params.delete('focusFixed')
        const next = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (next ? '?' + next : ''))
      }
    }
  }, [isAdminViewing, effectiveFlat, effectiveTransactions, effectiveCharges])

  const parentCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const archivedParentCategories = effectiveCategories.filter((c: any) => c.actif === false && !c.parent_id)
  const subCats = (id: string, includeArchived = false) => subcategoriesEnabled ? effectiveCategories
    .filter((c: any) => c.parent_id === id && (includeArchived || c.actif !== false))
    .sort((a: any, b: any) => String(a.nom).localeCompare(String(b.nom), 'fr', { sensitivity:'base' })) : []
  // A parent category displays the sum of its sub-budgets when those budgets exist.
  // Preserve the standalone parent amount for categories without configured sub-budgets.
  const budget = (id: string) => {
    const children = subCats(id)
    const configured = children.filter((child: any) =>
      effectiveBudgets.some((entry: any) => entry.categorie_id === child.id)
    )
    if (configured.length > 0) {
      return configured.reduce((total: number, child: any) =>
        total + Number(effectiveBudgets.find((entry: any) => entry.categorie_id === child.id)?.prevu || 0), 0)
    }
    return Number(effectiveBudgets.find((entry: any) => entry.categorie_id === id)?.prevu || 0)
  }
  const refundTotal = (tx: any) => (tx.remboursements || []).reduce((sum: number, item: any) => sum + Number(item.montant), 0)
  const net = (tx: any) => Number(tx.montant) - refundTotal(tx)
  const spent = (id: string, sub = false) => effectiveFlat.filter((t: any) => (sub ? t.sous_categorie_id : t.categorie_id) === id).reduce((sum: number, t: any) => sum + net(t), 0)

  const sortedParentCategories = useMemo(() => {
    const rows = parentCategories.map((cat:any) => {
      const planned = budget(cat.id)
      const actual = spent(cat.id)
      return { cat, planned, actual, remaining: planned - actual }
    })
    const alpha = (a:any,b:any) => String(a.cat.nom).localeCompare(String(b.cat.nom), 'fr', { sensitivity:'base' })
    rows.sort((a:any,b:any) => {
      if (categorySort === 'planned') {
        const aHasPlanned = a.planned > 0
        const bHasPlanned = b.planned > 0
        if (aHasPlanned !== bHasPlanned) return aHasPlanned ? -1 : 1
        if (aHasPlanned && bHasPlanned && b.planned !== a.planned) return b.planned - a.planned
        if (!aHasPlanned && !bHasPlanned && b.actual !== a.actual) return b.actual - a.actual
        return alpha(a,b)
      }
      if (categorySort === 'actual' && b.actual !== a.actual) return b.actual - a.actual
      if (categorySort === 'remaining' && b.remaining !== a.remaining) return b.remaining - a.remaining
      return alpha(a,b)
    })
    return rows.map((row:any) => row.cat)
  }, [parentCategories, effectiveBudgets, effectiveFlat, categorySort])

  const parentCategoryIds = new Set(parentCategories.map((c: any) => c.id))
  const parentBudgets = effectiveBudgets.filter((b: any) => parentCategoryIds.has(b.categorie_id))
  const compactBudgets = parentCategories
    .map((cat: any) => {
      const planned = budget(cat.id)
      const actual = spent(cat.id)
      const remaining = planned - actual
      const percent = planned > 0 ? Math.round((actual / planned) * 100) : (actual > 0 ? 100 : 0)
      return { ...cat, planned, actual, remaining, percent }
    })
    .filter((item: any) => item.planned > 0 || item.actual > 0)
    .sort((a: any, b: any) => b.percent - a.percent)
    .slice(0, 5)
  const expenseSummary = summarizeAnalyticalExpenses(effectiveCharges, parentBudgets, effectiveFlat)
  const { plannedFixed, actualFixed, plannedVariable, actualVariable, plannedTotal, actualTotal } = expenseSummary
  const variance = actualTotal - plannedTotal
  const actualPercent = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0
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
    ? selectedOccurrences.find((item: any) => String(item.mois?.mois || '').slice(0, 7) === month.slice(0, 7)) || null
    : null
  const subBudgetTotal = budgetModalSubcats.reduce((sum: number, sub: any) => sum + (Number(budgetDraft[sub.id]) || 0), 0)
  const isSubBudgetMode = subBudgetTotal > 0
  const effectiveParentBudgetDraft = isSubBudgetMode
    ? subBudgetTotal
    : (Number(budgetDraft[budgetModalCategory?.id || '']) || 0)
  const budgetModalEntity = budgetModalSubcategory || budgetModalCategory
  const selectedBudgetPlanned = budgetModalSubcategory
    ? (Number(budgetDraft[budgetModalSubcategory.id]) || 0)
    : effectiveParentBudgetDraft
  const selectedBudgetActual = budgetModalSubcategory
    ? spent(budgetModalSubcategory.id, true)
    : (budgetModalCategory ? spent(budgetModalCategory.id) : 0)
  const selectedBudgetRemaining = selectedBudgetPlanned - selectedBudgetActual
  const selectedBudgetPercent = selectedBudgetPlanned > 0
    ? Math.round((selectedBudgetActual / selectedBudgetPlanned) * 100)
    : (selectedBudgetActual > 0 ? 100 : 0)

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
    const selected = subcategoryId ? children.find((sub: any) => sub.id === subcategoryId) : category
    setBudgetDraft(draft)
    setBudgetNameDraft(selected?.nom || '')
    setBudgetIconDraft(selected?.icone || (subcategoryId ? '📎' : '📂'))
    setBudgetModalSubcategoryId(subcategoryId)
    setBudgetModalId(categoryId)
  }

  const selectBudgetSubcategory = (subcategoryId: string | null) => {
    const selected = subcategoryId
      ? budgetModalSubcats.find((sub: any) => sub.id === subcategoryId)
      : budgetModalCategory
    setBudgetModalSubcategoryId(subcategoryId)
    setBudgetNameDraft(selected?.nom || '')
    setBudgetIconDraft(selected?.icone || (subcategoryId ? '📎' : '📂'))
  }

  const saveBudgetModal = async () => {
    if (!budgetModalCategory || !moisId || isAdminViewing) return
    if (budgetModalEntity && budgetNameDraft.trim()) {
      await updateCat.mutateAsync({
        id: budgetModalEntity.id,
        nom: budgetNameDraft.trim(),
        icone: budgetIconDraft,
      })
    }
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

  const addSelectedFixedOccurrence = async () => {
    if (!selectedFixedRecurring || isAdminViewing || !occurrenceMonth) return
    await addOccurrence.mutateAsync({ targetMonth: occurrenceMonth, recurring: selectedFixedRecurring })
  }

  const removeSelectedFixedOccurrence = async (id: string) => {
    if (isAdminViewing) return
    await removeOccurrence.mutateAsync(id)
  }

  const editOccurrenceFromHistory = (occurrence: any) => {
    setManagementView(null)
    editFixedTarget(occurrence)
  }

  const saveSuspension = async () => {
    if (!selectedFixedRecurring || isAdminViewing) return
    await updateFixedRecurring.mutateAsync({
      id: selectedFixedRecurring.id,
      suspended_from: suspensionFrom ? suspensionFrom + '-01' : null,
      suspended_until: suspensionUntil ? suspensionUntil + '-01' : null,
    })
  }

  useEffect(() => {
    if (!selectedFixedRecurring) {
      setOccurrenceMonth(month.slice(0, 7))
      setSuspensionFrom('')
      setSuspensionUntil('')
      return
    }
    setOccurrenceMonth(month.slice(0, 7))
    setSuspensionFrom(selectedFixedRecurring.suspended_from?.slice(0, 7) || '')
    setSuspensionUntil(selectedFixedRecurring.suspended_until?.slice(0, 7) || '')
  }, [selectedFixedRecurringId, selectedFixedRecurring?.suspended_from, selectedFixedRecurring?.suspended_until, month])

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
      const paymentDate = String(charge.date_prevue || month.slice(0, 7) + '-01').slice(0, 10)
      const validationDate = charge.date_reelle ? String(charge.date_reelle).slice(0, 10) : null
      return {
        id: 'fixed-' + charge.id,
        source: 'fixed' as const,
        sourceData: charge,
        paymentDate,
        validationDate,
        createdAt: charge.created_at || null,
        entryOrder: Number(charge.ordre || 0),
        status: validated ? 'validated' as const : 'planned' as const,
        title: charge.nom,
        subcategory: null,
        icon: '📌',
        amount: Number(validated ? (charge.montant_reel ?? charge.montant) : charge.montant),
        grossAmount: Number(validated ? (charge.montant_reel ?? charge.montant) : charge.montant),
        refund: 0,
        info: 'Charge fixe',
      }
    })

    const transactionEntries = effectiveTransactions.map((tx: any) => {
      const validated = Boolean(tx.date_validation)
      const reimbursement = refundTotal(tx)
      return {
        id: 'tx-' + tx.id,
        source: 'transaction' as const,
        sourceData: tx,
        paymentDate: String(tx.date || month.slice(0, 7) + '-01').slice(0, 10),
        validationDate: tx.date_validation ? String(tx.date_validation).slice(0, 10) : null,
        createdAt: tx.created_at || null,
        entryOrder: Number(tx.ordre || 0),
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

  const pendingActualEntries = actualEntries.filter(entry => entry.status === 'planned')
  const filteredActualEntries = actualEntries.filter(entry => entry.status === 'validated')

  const sortedActualEntries = useMemo(() => {
    const dateValue = (entry: any) => {
      const value = actualSort === 'validation' ? entry.validationDate : entry.paymentDate
      return value ? Date.parse(value + 'T12:00:00') : Number.NEGATIVE_INFINITY
    }
    const creationValue = (entry: any) => entry.createdAt ? Date.parse(entry.createdAt) : Number.NEGATIVE_INFINITY

    return [...filteredActualEntries].sort((a, b) => {
      const dateDiff = dateValue(b) - dateValue(a)
      if (dateDiff !== 0) return dateDiff

      const creationDiff = creationValue(b) - creationValue(a)
      if (creationDiff !== 0) return creationDiff

      const orderDiff = Number(b.entryOrder || 0) - Number(a.entryOrder || 0)
      if (orderDiff !== 0) return orderDiff

      return String(b.id).localeCompare(String(a.id))
    })
  }, [filteredActualEntries, actualSort])

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, typeof sortedActualEntries>()
    const yesterdayDate = new Date(today + 'T12:00:00')
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = localDateISO(yesterdayDate)

    for (const entry of sortedActualEntries) {
      const displayDate = actualSort === 'validation' ? entry.validationDate : entry.paymentDate
      const label = !displayDate
        ? 'Sans date de validation'
        : displayDate === today
          ? "Aujourd'hui"
          : displayDate === yesterday
            ? 'Hier'
            : formatDate(displayDate)
      const list = groups.get(label) || []
      list.push(entry)
      groups.set(label, list)
    }
    return Array.from(groups.entries())
  }, [sortedActualEntries, today, actualSort])

  const applyActualValidation = async (entry: any, checked: boolean, date?: string | null) => {
    if (isAdminViewing) return
    if (entry.source === 'fixed') {
      await togglePayee.mutateAsync({ id: entry.sourceData.id, payee: checked, dateReelle: checked ? (date || today) : null })
      return
    }
    await updateTx.mutateAsync({
      id: entry.sourceData.id,
      date_validation: checked ? (date || today) : null,
    })
  }

  const selectBudgetBrowse = (categoryId: string, subcategoryId: string | null = null) => {
    setBrowseCategoryId(categoryId)
    setBrowseSubcategoryId(subcategoryId)
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      window.setTimeout(() => document.getElementById('expense-right-panel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 0)
    }
  }

  const browsedCategory = browseCategoryId ? parentCategories.find((cat:any) => cat.id === browseCategoryId) || null : null
  const browsedSubcategory = browseSubcategoryId ? effectiveCategories.find((cat:any) => cat.id === browseSubcategoryId) || null : null
  const browsedEntries = browseCategoryId
    ? sortedActualEntries.filter((entry:any) => {
        if (entry.source !== 'transaction') return false
        const tx = entry.sourceData
        return tx.categorie_id === browseCategoryId && (!browseSubcategoryId || tx.sous_categorie_id === browseSubcategoryId)
      })
    : sortedActualEntries

  const toggleActualEntry = async (entry: any, checked: boolean) => {
    if (isAdminViewing) return
    if (!checked) {
      await applyActualValidation(entry, false, null)
      return
    }
    if (espace?.double_date) {
      setValidationEntry(entry)
      setValidationDate(today)
      return
    }
    await applyActualValidation(entry, true, today)
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

  const createFixedExpense = async (value: { nom: string; montant: number; frequence: number; jourPrevu: number }) => {
    if (!moisId || !espace || isAdminViewing) return
    let recurrent_id: string | null = null
    if (value.frequence > 0) {
      const recurrent = await createFixedRecurring.mutateAsync({
        espace_id: espace.id,
        nom: value.nom,
        montant: value.montant,
        categorie_id: null,
        sous_categorie_id: null,
        actif: true,
        frequence_mois: value.frequence,
        jour_prevu: value.jourPrevu || 1,
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
      categorie_id: null,
      sous_categorie_id: null,
      payee: false,
      date_prevue: plannedDateForMonth(month, value.jourPrevu),
      ordre: charges.length,
    })
    setFixedOpen(false)
  }

  const saveFixed = (
    id: string,
    nom: string,
    montant: number,
    recurrentId: string | null,
    payee?: boolean,
    dateReelle?: string | null,
  ) => {
    const original = effectiveCharges.find((charge: any) => charge.id === id)
    const chargeInfoChanged = !!original && (
      String(original.nom || '').trim() !== nom.trim()
      || Number(original.montant) !== Number(montant)
    )

    if (recurrentId && chargeInfoChanged) {
      setScopeFixed({
        id,
        nom,
        montant,
        recurrentId,
        payee: !!payee,
        dateReelle: dateReelle ?? null,
      })
    } else {
      updateFixed.mutateAsync({
        id,
        nom,
        montant,
        categorie_id: null,
        sous_categorie_id: null,
        payee: !!payee,
        date_reelle: payee ? (dateReelle || today) : null,
      })
    }
    setEditFixed(null)
  }

  const saveFixedScope = async (scope: 'mois' | 'suivantes' | 'tous') => {
    if (!scopeFixed || isAdminViewing) return
    const occurrenceUpdates = {
      nom: scopeFixed.nom,
      montant: scopeFixed.montant,
      categorie_id: null,
      sous_categorie_id: null,
    }

    if (scope === 'mois') {
      await updateFixed.mutateAsync({
        id: scopeFixed.id,
        ...occurrenceUpdates,
        payee: !!scopeFixed.payee,
        date_reelle: scopeFixed.dateReelle ?? null,
      })
    } else {
      await updateOccurrenceScope.mutateAsync({
        recurrentId: scopeFixed.recurrentId,
        currentMonth: month,
        scope: scope === 'suivantes' ? 'future' : 'all',
        updates: occurrenceUpdates,
      })
      await updateFixed.mutateAsync({
        id: scopeFixed.id,
        payee: !!scopeFixed.payee,
        date_reelle: scopeFixed.dateReelle ?? null,
      })
      await updateFixedRecurring.mutateAsync({
        id: scopeFixed.recurrentId,
        nom: scopeFixed.nom,
        montant: scopeFixed.montant,
        categorie_id: null,
        sous_categorie_id: null,
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
        </div>

        <div className="grid items-stretch gap-3 xl:grid-cols-2">
          <Card className="h-full border-slate-800 bg-slate-900">
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

          <Card className="h-full border-slate-800 bg-slate-900">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">Prévu vs réel par type</CardTitle></CardHeader>
            <CardContent className="min-w-0 space-y-2 p-3 pt-0">
              <div className="rounded-xl border border-slate-800 bg-slate-950/25 px-3 py-2.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-400" />
                    <span className="truncate text-xs font-semibold text-slate-200">Charges fixes</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-wide text-slate-600">Prévu</p>
                    <p className="text-xs font-semibold text-purple-200">{formatEuro(plannedFixed)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-wide text-slate-600">Réel</p>
                    <p className="text-xs font-semibold text-slate-100">{formatEuro(actualFixed)}</p>
                  </div>
                  <span className="w-9 text-right text-[10px] font-medium text-slate-500">
                    {plannedFixed > 0 ? Math.round((actualFixed / plannedFixed) * 100) : (actualFixed > 0 ? 100 : 0)} %
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={actualFixed > plannedFixed && plannedFixed > 0 ? 'h-full rounded-full bg-rose-400' : 'h-full rounded-full bg-purple-400'}
                    style={{ width: Math.min(100, plannedFixed > 0 ? (actualFixed / plannedFixed) * 100 : (actualFixed > 0 ? 100 : 0)) + '%' }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/25 px-3 py-2.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
                    <span className="truncate text-xs font-semibold text-slate-200">Dépenses variables</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-wide text-slate-600">Prévu</p>
                    <p className="text-xs font-semibold text-orange-200">{formatEuro(plannedVariable)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-wide text-slate-600">Réel</p>
                    <p className="text-xs font-semibold text-slate-100">{formatEuro(actualVariable)}</p>
                  </div>
                  <span className="w-9 text-right text-[10px] font-medium text-slate-500">
                    {plannedVariable > 0 ? Math.round((actualVariable / plannedVariable) * 100) : (actualVariable > 0 ? 100 : 0)} %
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={actualVariable > plannedVariable && plannedVariable > 0 ? 'h-full rounded-full bg-rose-400' : 'h-full rounded-full bg-orange-400'}
                    style={{ width: Math.min(100, plannedVariable > 0 ? (actualVariable / plannedVariable) * 100 : (actualVariable > 0 ? 100 : 0)) + '%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <PlannedExpenseValidationPanel
          entries={pendingActualEntries.map((entry:any) => ({
            id: entry.id,
            title: entry.title,
            subtitle: entry.subcategory ? entry.subcategory + ' · ' + entry.info : entry.info,
            amount: entry.amount,
            recurring: entry.source === 'fixed' && !!entry.sourceData?.recurrent_id,
            plannedDate: entry.paymentDate,
          }))}
          readOnly={isAdminViewing}
          busy={togglePayee.isPending || updateFixed.isPending || updateTx.isPending}
          onValidate={async (id, date, amount, scope) => {
            const entry = pendingActualEntries.find((item:any) => item.id === id)
            if (!entry) return
            if (entry.source === 'fixed') {
              if (scope === 'future' && entry.sourceData.recurrent_id) {
                await updateOccurrenceScope.mutateAsync({
                  recurrentId: entry.sourceData.recurrent_id,
                  currentMonth: month,
                  scope: 'future',
                  updates: { montant: amount },
                  pendingOnly: true,
                })
                await updateFixedRecurring.mutateAsync({
                  id: entry.sourceData.recurrent_id,
                  montant: amount,
                })
              }
              await updateFixed.mutateAsync({
                id: entry.sourceData.id,
                payee: true,
                date_reelle: date,
                montant_reel: amount,
                ...(scope === 'future' ? { montant: amount } : {}),
              })
            } else {
              await updateTx.mutateAsync({
                id: entry.sourceData.id,
                montant: amount,
                date_validation: date,
              })
            }
          }}
        />

        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
          <Card className="min-w-0 max-w-full border-slate-800 bg-slate-900">
            <CardHeader className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm text-slate-200">Catégories & budgets</CardTitle>
                <p className="mt-0.5 text-[10px] text-slate-500">Clique sur une catégorie ou sous-catégorie pour afficher son détail.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="relative">
                  <select
                    value={categorySort}
                    onChange={event => setCategorySort(event.target.value as CategorySort)}
                    className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-[11px] font-medium text-slate-300 outline-none hover:border-slate-600"
                    aria-label="Trier les catégories"
                  >
                    <option value="az">A - Z</option>
                    <option value="planned">Prévu</option>
                    <option value="actual">Réel</option>
                    <option value="remaining">Reste</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"/>
                </label>
                <Button size="sm" variant="outline" onClick={() => setManagementView('budgets')} className="h-8">
                  <Settings2 className="mr-1 h-3.5 w-3.5"/>Gérer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {parentCategories.length === 0 ? (
                <p className="py-4 text-xs text-slate-600">Aucune catégorie active.</p>
              ) : sortedParentCategories.map((cat:any) => {
                const planned=budget(cat.id)
                const actual=spent(cat.id)
                const remaining=planned-actual
                const percent=planned>0?Math.round(actual/planned*100):(actual>0?100:0)
                const children=subCats(cat.id)
                return (
                  <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/25">
                    <button type="button" onClick={() => selectBudgetBrowse(cat.id)} className={'w-full px-3 py-2.5 text-left transition hover:bg-slate-800/35 '+(browseCategoryId===cat.id&&!browseSubcategoryId?'bg-slate-800/45':'')}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icone||'📂'}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{cat.nom}</span>
                        <span className={'shrink-0 text-right text-[10px] font-semibold '+(remaining<0?'text-rose-300':percent>=80?'text-amber-300':'text-emerald-300')}>{formatEuro(remaining)} reste</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 pl-7">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className={'h-full rounded-full '+(percent>100?'bg-rose-400':percent>=80?'bg-amber-400':'bg-emerald-400')} style={{width:Math.min(100,percent)+'%'}}/></div>
                        <span className="shrink-0 text-[9px] text-slate-600">{formatEuro(actual)} / {formatEuro(planned)}</span>
                      </div>
                    </button>
                    {children.length>0 && <div className="border-t border-slate-800/60 px-2 py-1.5">
                      {children.map((sub:any)=>{
                        const subPlanned=budget(sub.id)
                        const subActual=spent(sub.id,true)
                        return <button key={sub.id} type="button" onClick={()=>selectBudgetBrowse(cat.id,sub.id)} className={'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-slate-800/35 '+(browseSubcategoryId===sub.id?'bg-indigo-500/10 text-indigo-200':'text-slate-400')}>
                          <span className="w-5 text-center">{sub.icone||'•'}</span><span className="min-w-0 flex-1 truncate">{sub.nom}</span><span className="text-[10px] text-slate-600">{formatEuro(subActual)} / {formatEuro(subPlanned)}</span>
                        </button>
                      })}
                    </div>}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card id="expense-right-panel" className="min-w-0 max-w-full scroll-mt-20 border-slate-800 bg-slate-900">
            <CardHeader className="flex min-w-0 flex-col items-start gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-sm text-slate-200">{browsedCategory ? (browsedSubcategory ? browsedSubcategory.nom : browsedCategory.nom) : 'Dépenses réelles'}</CardTitle>
                <p className="mt-0.5 text-[10px] text-slate-500">{browsedCategory ? 'Détail du budget et des dépenses validées.' : 'Mouvements validés du mois.'}</p>
              </div>
              <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {!browsedCategory && <>
                  <label className="relative">
                    <select value={actualSort} onChange={event=>setActualSort(event.target.value as 'payment'|'validation')} className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-[11px] text-slate-300 outline-none">
                      <option value="payment">Date de transaction</option><option value="validation">Date de validation</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"/>
                  </label>
                  {!isAdminViewing && <>
                    <Button size="sm" variant="outline" className="h-8" onClick={()=>setManagementView('fixed')}><CalendarClock className="mr-1 h-3.5 w-3.5"/>Charges fixes</Button>
                    <Button size="sm" className="hidden h-8 md:inline-flex" onClick={()=>setTxOpen(true)}><Plus className="mr-1 h-3.5 w-3.5"/>Dépense</Button>
                  </>}
                </>}
                {browsedCategory && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={()=>{setBrowseCategoryId(null);setBrowseSubcategoryId(null)}} aria-label="Fermer le détail"><X className="h-4 w-4"/></Button>}
              </div>
            </CardHeader>
            <CardContent className="min-w-0 p-3 pt-0">
              {browsedCategory && (
                <div className="mb-3 grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                  <Metric label="Prévu" value={formatEuro(browsedSubcategory?budget(browsedSubcategory.id):budget(browsedCategory.id))}/>
                  <Metric label="Réel" value={formatEuro(browsedSubcategory?spent(browsedSubcategory.id,true):spent(browsedCategory.id))}/>
                  <Metric label="Restant" value={formatEuro((browsedSubcategory?budget(browsedSubcategory.id):budget(browsedCategory.id))-(browsedSubcategory?spent(browsedSubcategory.id,true):spent(browsedCategory.id)))}/>
                </div>
              )}
              {browsedEntries.length===0 ? (
                <EmptyStateV2 icon={ReceiptText} title={browsedCategory?'Aucune dépense validée':'Aucune dépense réelle'} description={browsedCategory?'Aucune dépense validée pour cette sélection ce mois.':'Les dépenses validées apparaîtront ici.'}/>
              ) : (
                <div className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800/70">
                  {browsedEntries.map((entry:any)=>(
                    <div key={entry.id} role={!isAdminViewing?'button':undefined} tabIndex={!isAdminViewing?0:undefined} onClick={()=>{if(isAdminViewing)return;if(entry.source==='fixed')editFixedTarget(entry.sourceData);else setEditTx(entry.sourceData)}} className="flex min-w-0 cursor-pointer flex-wrap items-center gap-2 px-3 py-3 transition hover:bg-slate-800/30 sm:flex-nowrap sm:gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950/60 text-lg">{entry.icon}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{entry.title}</p><p className="truncate text-[11px] text-slate-500">{entry.subcategory?entry.subcategory+' · ':''}{entry.info}</p></div>
                      <div className="ml-auto min-w-0 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <strong className={entry.source==='fixed'?'text-purple-300':'text-rose-300'}>{formatEuro(entry.amount)}</strong>
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">Validé</span>
                        </div>
                        {entry.refund > 0 && <div className="mt-1 space-y-0.5">
                          <p className="text-[10px] text-slate-500"><span className="line-through">{formatEuro(entry.grossAmount)}</span><span className="ml-1.5 text-emerald-300">Remboursé : {formatEuro(entry.refund)}</span></p>
                          {!isAdminViewing && reimbursementsEnabled && entry.source==='transaction' &&
                            <button type="button" className="text-[10px] font-medium text-indigo-300 hover:text-indigo-200" onClick={event=>{event.stopPropagation();setRembTx(entry.sourceData)}}>Gérer le remboursement</button>}
                        </div>}
                        <div className="mt-0.5 flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <span>Transaction : {entry.paymentDate ? formatDate(entry.paymentDate) : '—'}</span>
                          <span>Validation : {entry.validationDate ? formatDate(entry.validationDate) : '—'}</span>
                        </div>
                      </div>
                      {!isAdminViewing&&<button className="shrink-0 p-1 text-slate-700 hover:text-rose-400" aria-label="Supprimer" onClick={event=>{event.stopPropagation();if(entry.source==='fixed')setDeleteFixed({id:entry.sourceData.id,recurrentId:entry.sourceData.recurrent_id,nom:entry.sourceData.nom});else setDeleteTx(entry.sourceData)}}><Trash2 className="h-3.5 w-3.5"/></button>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!validationEntry} onOpenChange={open => { if (!open) { setValidationEntry(null); setValidationDate('') } }}>
          <DialogContent className="max-w-sm border-slate-700 bg-slate-900">
            <DialogHeader>
              <DialogTitle>Date de validation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Confirme la date de validation de cette dépense. La date du jour est proposée par défaut.</p>
              <Input type="date" value={validationDate} onChange={event => setValidationDate(event.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setValidationEntry(null); setValidationDate('') }}>Annuler</Button>
                <Button
                  disabled={!validationDate}
                  onClick={async () => {
                    if (!validationEntry || !validationDate) return
                    await applyActualValidation(validationEntry, true, validationDate)
                    setValidationEntry(null)
                    setValidationDate('')
                  }}
                >
                  <Check className="mr-1.5 h-4 w-4" />Valider
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={managementView === 'fixed'} onOpenChange={open => { if (!open) { setManagementView(null); setSelectedFixedRecurringId(null) } }}>
          <DialogContent className="max-w-4xl border-slate-700 bg-slate-900">
            <DialogHeader>
              <DialogTitle>Charges fixes récurrentes</DialogTitle>
              <p className="text-xs text-slate-500">Gère les modèles récurrents et leurs occurrences.</p>
            </DialogHeader>
            <div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1 md:grid-cols-[1fr_1.05fr]">
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{showArchivedFixed ? 'Charges archivées' : 'Charges actives'}</p>
                    <p className="text-[11px] text-slate-500">{showArchivedFixed ? archivedFixedRecurrents.length : activeFixedRecurrents.length} charge(s)</p>
                  </div>
                  <div className="flex gap-2">
                    {!isAdminViewing && !showArchivedFixed && (
                      <Button size="sm" onClick={() => { setManagementView(null); setFixedOpen(true) }}>
                        <Plus className="mr-1 h-3.5 w-3.5" />Ajouter
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setShowArchivedFixed(value => !value); setSelectedFixedRecurringId(null) }}>
                      {showArchivedFixed ? <RotateCcw className="mr-1 h-3.5 w-3.5" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
                      {showArchivedFixed ? 'Voir les actives' : 'Voir les archivées'}
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/25">
                  {(showArchivedFixed ? archivedFixedRecurrents : activeFixedRecurrents).length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Aucune charge dans cette liste.</p>
                  ) : (showArchivedFixed ? archivedFixedRecurrents : activeFixedRecurrents).map((recurring: any) => {
                    return (
                      <button key={recurring.id} type="button" onClick={() => setSelectedFixedRecurringId(recurring.id)} className={'flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-800/40 ' + (selectedFixedRecurringId === recurring.id ? 'bg-slate-800/50' : '')}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300"><CalendarClock className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{recurring.nom}</p><p className="text-[10px] text-slate-500">{fixedFrequencyLabel(recurring)}</p></div>
                        <strong className="text-sm text-purple-300">{formatEuro(Number(recurring.montant))}</strong>
                      </button>
                    )
                  })}
                </div>

              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                {!selectedFixedRecurring ? (
                  <div className="flex min-h-48 items-center justify-center text-center text-sm text-slate-500">Sélectionne une charge fixe pour gérer sa récurrence.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-semibold text-slate-100">{selectedFixedRecurring.nom}</h3><p className="mt-1 text-xs text-slate-500">{fixedFrequencyLabel(selectedFixedRecurring)} · depuis {selectedFixedRecurring.mois_debut ? formatDate(selectedFixedRecurring.mois_debut) : 'date non renseignée'}</p></div>
                      <div className="flex items-center gap-2"><span className={'rounded-full px-2 py-0.5 text-[9px] font-medium ' + (selectedFixedRecurring.actif === false ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-300')}>{selectedFixedRecurring.actif === false ? 'Archivée' : 'Active'}</span><strong className="text-purple-300">{formatEuro(Number(selectedFixedRecurring.montant))}</strong></div>
                    </div>

                    {!isAdminViewing && selectedFixedRecurring.actif === false && (
                      <Button className="w-full" onClick={() => setFixedRecurringActive(selectedFixedRecurring.id, true)}>
                        <RotateCcw className="mr-1 h-4 w-4" />Désarchiver la charge
                      </Button>
                    )}
                    {selectedFixedRecurring.actif !== false && (
                      <>
                        <div className="rounded-xl border border-slate-800 p-3">
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <span>Jour prévu</span>
                            <span className="relative inline-flex"><button type="button" aria-label="À quoi sert le jour prévu ?" aria-expanded={fixedHelp === 'day'} onClick={() => setFixedHelp(fixedHelp === 'day' ? null : 'day')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-slate-100"><Info className="h-3 w-3" /></button>{fixedHelp === 'day' && <span role="tooltip" className="absolute right-0 top-7 z-50 w-60 max-w-[80vw] rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-2xl">Définit le jour du mois utilisé pour la date prévue de cette charge récurrente. Les occurrences déjà générées mais non validées sont réalignées sur ce jour.</span>}</span>
                          </div>
                          <label className="text-[10px] text-slate-500">Jour du mois <span className="text-slate-600">(1 par défaut)</span>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={Number(selectedFixedRecurring.jour_prevu || 1)}
                              disabled={isAdminViewing}
                              onChange={event => updateFixedRecurring.mutate({
                                id: selectedFixedRecurring.id,
                                jour_prevu: Math.min(31, Math.max(1, Number(event.target.value) || 1)),
                              })}
                              className="input input-bordered input-sm mt-1 w-full"
                            />
                          </label>
                        </div>

                        <div className="rounded-xl border border-slate-800 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Ajouter une occurrence</p>
                              <span className="relative inline-flex"><button type="button" aria-label="À quoi sert l'ajout d'une occurrence ?" aria-expanded={fixedHelp === 'add'} onClick={() => setFixedHelp(fixedHelp === 'add' ? null : 'add')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-slate-100"><Info className="h-3 w-3" /></button>{fixedHelp === 'add' && <span role="tooltip" className="absolute right-0 top-7 z-50 w-60 max-w-[80vw] rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-2xl">Crée manuellement cette charge sur un mois où aucune occurrence n’existe encore.</span>}</span>
                            </div>
                            <CalendarDays className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input type="month" value={occurrenceMonth} onChange={event => setOccurrenceMonth(event.target.value)} className="input input-bordered input-sm flex-1" />
                            {!isAdminViewing && (
                              <Button size="sm" onClick={addSelectedFixedOccurrence} disabled={addOccurrence.isPending || selectedOccurrences.some((item: any) => String(item.mois?.mois || '').slice(0, 7) === occurrenceMonth)}>
                                <Plus className="mr-1 h-3.5 w-3.5" />Ajouter
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 p-3">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Suspendre une période</p>
                            <span className="relative inline-flex"><button type="button" aria-label="À quoi sert la suspension ?" aria-expanded={fixedHelp === 'suspend'} onClick={() => setFixedHelp(fixedHelp === 'suspend' ? null : 'suspend')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-slate-100"><Info className="h-3 w-3" /></button>{fixedHelp === 'suspend' && <span role="tooltip" className="absolute right-0 top-7 z-50 w-60 max-w-[80vw] rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-2xl">Empêche la création automatique de cette charge pendant la période choisie, sans supprimer le modèle ni son historique.</span>}</span>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="text-[10px] text-slate-500">Du<input type="month" value={suspensionFrom} onChange={event => setSuspensionFrom(event.target.value)} className="input input-bordered input-sm mt-1 w-full" /></label>
                            <label className="text-[10px] text-slate-500">Au<input type="month" value={suspensionUntil} onChange={event => setSuspensionUntil(event.target.value)} className="input input-bordered input-sm mt-1 w-full" /></label>
                          </div>
                          {!isAdminViewing && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={saveSuspension} disabled={updateFixedRecurring.isPending}>Enregistrer la suspension</Button>}
                          {(selectedFixedRecurring.suspended_from || selectedFixedRecurring.suspended_until) && <p className="mt-2 text-[10px] text-amber-300">Suspendue {selectedFixedRecurring.suspended_from ? 'à partir de ' + formatDate(selectedFixedRecurring.suspended_from) : ''}{selectedFixedRecurring.suspended_until ? ' jusqu’au ' + formatDate(selectedFixedRecurring.suspended_until) : ''}.</p>}
                        </div>
                      </>
                    )}

                    <div className="rounded-xl border border-slate-800 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Historique des occurrences</p>
                          <span className="relative inline-flex"><button type="button" aria-label="À quoi sert l'historique ?" aria-expanded={fixedHelp === 'history'} onClick={() => setFixedHelp(fixedHelp === 'history' ? null : 'history')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-slate-100"><Info className="h-3 w-3" /></button>{fixedHelp === 'history' && <span role="tooltip" className="absolute right-0 top-7 z-50 w-60 max-w-[80vw] rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-2xl">Liste toutes les occurrences déjà créées pour cette charge, y compris lorsqu’elle est archivée. L’archivage ne supprime pas cet historique.</span>}</span>
                        </div>
                        <span className="text-[10px] text-slate-600">{selectedOccurrences.length}</span>
                      </div>
                      {selectedOccurrences.length === 0 ? <p className="text-xs text-slate-500">Aucune occurrence enregistrée.</p> : (
                        <div className="max-h-64 divide-y divide-slate-800/70 overflow-y-auto">
                          {selectedOccurrences.map((occurrence: any) => (
                            <div key={occurrence.id} className="flex items-center gap-2 py-2">
                              <button type="button" onClick={() => editOccurrenceFromHistory(occurrence)} className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-medium text-slate-200">{formatDate(occurrence.mois?.mois || occurrence.date_prevue || month)}</p>
                                <p className="text-[10px] text-slate-500">{occurrence.payee ? 'Validée' : 'À valider'} · {formatEuro(Number(occurrence.montant))}</p>
                              </button>
                              {!isAdminViewing && <Button size="sm" variant="ghost" onClick={() => removeSelectedFixedOccurrence(occurrence.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isAdminViewing && selectedFixedRecurring.actif !== false && (
                      <Button className="w-full" variant="outline" onClick={() => setFixedRecurringActive(selectedFixedRecurring.id, false)}><Archive className="mr-1 h-4 w-4" />Archiver la charge</Button>
                    )}
                    <p className="text-[10px] leading-4 text-slate-600">Modifier une occurrence depuis l’historique permet ensuite de choisir : cette occurrence uniquement, cette occurrence et les suivantes, ou toute la série. Archiver conserve tout l’historique.</p>
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
                          {!isAdminViewing && !showArchivedCategories && <Button size="sm" variant="outline" onClick={() => {setMoveCategoryId(cat.id);setMoveParentId('');setMoveError('')}}>Déplacer</Button>}
                          {!isAdminViewing && !showArchivedCategories && <Button size="sm" variant="outline" onClick={() => {setMergeSourceId(cat.id);setMergeDestinationId('');setMergePreview(null);setMergeError('')}}>Fusionner</Button>}
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
                              {!isAdminViewing && !showArchivedCategories && <Button size="sm" variant="outline" onClick={() => {setMoveCategoryId(sub.id);setMoveParentId(cat.id);setMoveError('')}}>Déplacer</Button>}
                              {!isAdminViewing && !showArchivedCategories && <Button size="sm" variant="outline" onClick={() => {setMergeSourceId(sub.id);setMergeDestinationId('');setMergePreview(null);setMergeError('')}}>Fusionner</Button>}
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

        <Dialog open={!!budgetModalCategory} onOpenChange={open => { if (!open) { setBudgetModalId(null); setBudgetModalSubcategoryId(null); setBudgetNameDraft(''); setBudgetIconDraft('📂') } }}>
          <DialogContent className="max-w-3xl border-slate-700 bg-slate-900">
            {budgetModalCategory && (
              <>
                <DialogHeader>
                  <DialogTitle>{budgetModalSubcategory ? 'Modifier la sous-catégorie' : 'Modifier la catégorie'}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                  <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/25 p-4">
                    <div className="flex items-end gap-3">
                      <div className="shrink-0">
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-slate-600">Icône</label>
                        <EmojiPicker compact value={budgetIconDraft} onChange={setBudgetIconDraft} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-slate-600">Nom</label>
                        <input value={budgetNameDraft} onChange={event => setBudgetNameDraft(event.target.value)} className="input input-bordered h-11 w-full bg-slate-950/50 text-base font-semibold" disabled={isAdminViewing} />
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3">
                        <label className="text-[10px] font-medium uppercase tracking-wide text-indigo-300/70">Budget prévu</label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={budgetModalSubcategory ? (budgetDraft[budgetModalSubcategory.id] ?? '') : (isSubBudgetMode ? String(subBudgetTotal) : (budgetDraft[budgetModalCategory.id] ?? ''))}
                            onChange={event => setBudgetDraft(prev => ({ ...prev, [budgetModalEntity?.id || '']: event.target.value }))}
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-bold text-indigo-100 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isAdminViewing || (!budgetModalSubcategory && isSubBudgetMode)}
                          />
                          <span className="text-sm font-semibold text-indigo-300">€</span>
                        </div>
                        {!budgetModalSubcategory && isSubBudgetMode && <p className="mt-1 text-[10px] text-slate-600">Calculé automatiquement à partir des sous-catégories.</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-600">Réel</p>
                          <p className="mt-1 text-base font-bold text-slate-100">{formatEuro(selectedBudgetActual)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-600">Restant</p>
                          <p className={'mt-1 text-base font-bold ' + (selectedBudgetRemaining < 0 ? 'text-rose-300' : 'text-emerald-300')}>{formatEuro(selectedBudgetRemaining)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500"><span>Avancement</span><strong>{selectedBudgetPercent}%</strong></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className={'h-full rounded-full ' + (selectedBudgetPercent > 100 ? 'bg-rose-400' : selectedBudgetPercent >= 80 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: Math.min(100, selectedBudgetPercent) + '%' }} />
                      </div>
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
                            <button type="button" onClick={() => selectBudgetSubcategory(sub.id)} className="text-left"><p className="text-sm font-medium text-slate-200">{sub.icone || '•'} {sub.nom}</p><p className="text-[10px] text-slate-600">{formatEuro(budget(sub.id))} prévu · {formatEuro(spent(sub.id, true))} réel · {formatEuro(budget(sub.id) - spent(sub.id, true))} restant</p></button>
                            <input type="number" step="0.01" value={budgetDraft[sub.id] ?? ''} onChange={event => setBudgetDraft(prev => ({ ...prev, [sub.id]: event.target.value }))} className="input input-bordered input-sm w-full" disabled={isAdminViewing} />
                            <p className="text-right text-xs text-slate-500">Reste {formatEuro((Number(budgetDraft[sub.id]) || 0) - spent(sub.id, true))}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-200">Dépenses du mois{budgetModalSubcategory ? ' · ' + budgetModalSubcategory.nom : ''}</h3>{budgetModalSubcategory && <Button size="sm" variant="ghost" onClick={() => selectBudgetSubcategory(null)}>Voir toute la catégorie</Button>}</div>
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

        <Dialog open={!!moveCategoryId} onOpenChange={open => {if(!open){setMoveCategoryId(null);setMoveError('')}}}>
          <DialogContent className="max-w-md border-slate-700 bg-slate-900">
            <DialogHeader><DialogTitle>Réorganiser une catégorie</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-400">Le déplacement s&apos;applique aussi aux dépenses et charges récurrentes de l&apos;historique. Les montants de budgets restent inchangés.</p>
            <label className="block text-sm text-slate-300">Nouvel emplacement
              <select className="input input-bordered mt-2 w-full" value={moveParentId} onChange={event => {setMoveParentId(event.target.value);setMoveError('')}}>
                <option value="">Catégorie principale</option>
                {parentCategories.filter((cat:any) => cat.id !== moveCategoryId).map((cat:any) => <option key={cat.id} value={cat.id}>Sous-catégorie de {cat.nom}</option>)}
              </select>
            </label>
            {!!moveCategoryId && parentCategories.some((cat:any) => cat.id === moveCategoryId) && moveParentId !== '' && subCats(moveCategoryId).length > 0 && <p className="text-xs text-amber-300">Déplace d&apos;abord les sous-catégories existantes de cette catégorie.</p>}
            {moveError && <p role="alert" className="text-xs text-rose-300">{moveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMoveCategoryId(null)}>Annuler</Button>
              <Button disabled={moveCat.isPending || (!!moveCategoryId && parentCategories.some((cat:any) => cat.id === moveCategoryId) && moveParentId !== '' && subCats(moveCategoryId).length > 0)} onClick={async () => {if(!moveCategoryId)return;try{await moveCat.mutateAsync({id:moveCategoryId,parentId:moveParentId||null});setMoveCategoryId(null);setBrowseCategoryId(null);setBrowseSubcategoryId(null)}catch(error){setMoveError(error instanceof Error?error.message:'Déplacement impossible')}}}>Confirmer le déplacement</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!mergeSourceId} onOpenChange={open => {if(!open){setMergeSourceId(null);setMergePreview(null);setMergeError('')}}}>
          <DialogContent className="max-w-md border-slate-700 bg-slate-900">
            <DialogHeader><DialogTitle>Fusionner deux catégories</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-400">La catégorie source sera archivée. Les opérations et récurrences historiques seront conservées et rattachées à la destination. Les sous-catégories seront transférées.</p>
            <label className="block text-xs text-slate-300">Catégorie conservée
              <select value={mergeDestinationId} onChange={event=>{setMergeDestinationId(event.target.value);setMergePreview(null);setMergeError('')}} className="input input-bordered mt-2 w-full">
                <option value="">Choisir une destination</option>
                {effectiveCategories.filter((cat:any)=>cat.actif!==false&&cat.id!==mergeSourceId&&cat.parent_id===(effectiveCategories.find((src:any)=>src.id===mergeSourceId)?.parent_id||null)).map((cat:any)=><option key={cat.id} value={cat.id}>{cat.nom}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-300">Règle pour les budgets communs aux deux catégories
              <select value={mergeBudgetRule} onChange={event=>{setMergeBudgetRule(event.target.value as 'destination'|'sum'|'max');setMergePreview(null)}} className="input input-bordered mt-2 w-full">
                <option value="destination">Conserver le montant de destination</option>
                <option value="sum">Additionner les montants</option>
                <option value="max">Conserver le plus élevé</option>
              </select>
            </label>
            {mergePreview && <section className="rounded-xl border border-slate-700 p-3 text-xs text-slate-300">
              <p className="mb-2 font-semibold">Éléments concernés dans tout l&apos;historique</p>
              <p>{mergePreview.transactions} dépenses · {mergePreview.fixed_expenses} charges fixes · {mergePreview.recurrences} récurrences</p>
              <p>{mergePreview.monthly_budgets} budgets mensuels · {mergePreview.budget_templates} modèles · {mergePreview.children} sous-catégories</p>
              <p className="mt-2 text-amber-300">Cette fusion concerne également les mois précédents. Confirme seulement après avoir vérifié ces informations.</p>
            </section>}
            {mergeError && <p role="alert" className="text-xs text-rose-300">{mergeError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>setMergeSourceId(null)}>Annuler</Button>
              <Button disabled={!mergeSourceId||!mergeDestinationId||mergeCat.isPending} onClick={async()=>{
                if(!mergeSourceId||!mergeDestinationId)return
                try {
                  const args={sourceId:mergeSourceId,destinationId:mergeDestinationId,budgetRule:mergeBudgetRule}
                  if(!mergePreview){setMergePreview(await mergeCat.mutateAsync({...args,previewOnly:true}))}
                  else {await mergeCat.mutateAsync(args);setMergeSourceId(null);setMergePreview(null);setBrowseCategoryId(null);setBrowseSubcategoryId(null)}
                } catch(error){setMergeError(error instanceof Error?error.message:'Fusion impossible')}
              }}>{mergeCat.isPending?'Traitement…':mergePreview?'Confirmer la fusion':'Prévisualiser'}</Button>
            </div>
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

        <ChargeFixeForm open={fixedOpen} onOpenChange={setFixedOpen} onSubmit={createFixedExpense} />
        <ChargeFixeEditDialog editTarget={editFixed} doubleDate={espace?.double_date ?? false} onClose={() => setEditFixed(null)} onSave={saveFixed} />
        <ChargeFixeDeleteDialog target={deleteFixed} onClose={() => setDeleteFixed(null)} onDelete={removeFixedExpense} />
        <ChargeFixeScopeDialog target={scopeFixed} onClose={() => setScopeFixed(null)} onSave={saveFixedScope} />
        <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} subcategoriesEnabled={subcategoriesEnabled} splitEnabled={splitEnabled} onSubmit={createTransaction} onSubmitSplit={splitEnabled ? createSplitTransaction : undefined} />
        <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} subcategoriesEnabled={subcategoriesEnabled} onSave={async (data:any) => { await updateTx.mutateAsync(data); setEditTx(null) }} onRemb={reimbursementsEnabled ? ((tx:any) => { setEditTx(null); setRembTx(tx) }) : undefined} onSplit={splitEnabled ? ((tx:any) => { setEditTx(null); setSplitTx(tx) }) : undefined} onUnsplit={splitEnabled ? (async(tx:any) => { await unsplit.mutateAsync(tx.id); setEditTx(null) }) : undefined} />
        <DepenseDeleteDialog target={deleteTx} onClose={() => setDeleteTx(null)} onDelete={(id:string) => { removeTx.mutate(id); setDeleteTx(null) }} />
        {splitEnabled && <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSave={async(parentId:string, lines:any[]) => { await split.mutateAsync({ parentId, lines }); setSplitTx(null) }} />}
        {reimbursementsEnabled && <RemboursementDialog tx={rembTx} reimbursements={remboursements} onClose={() => setRembTx(null)} onCreate={data => createRemb.mutateAsync(data).then(() => undefined)} onUpdate={data => updateRemb.mutateAsync(data).then(() => undefined)} onRemove={id => removeRemb.mutateAsync(id)} />}
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
