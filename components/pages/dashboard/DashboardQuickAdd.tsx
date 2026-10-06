'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpCircle, CalendarClock, PiggyBank, Plus, ReceiptText, RotateCcw, Search } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import RevenuForm from '@/components/pages/revenus/RevenuForm'
import ChargeFixeForm from '@/components/pages/charges-fixes/ChargeFixeForm'
import DepenseForm from '@/components/pages/variables/DepenseForm'
import MouvementForm from '@/components/pages/epargne/MouvementForm'
import RemboursementDialog from '@/components/pages/variables/RemboursementDialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRevenus, useRevenusRecurrents } from '@/lib/hooks/useRevenus'
import { useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useCategories } from '@/lib/hooks/useCategories'
import { useEnveloppes, useEpargneRecurrentes, useMouvements } from '@/lib/hooks/useEpargne'
import { useRemboursements } from '@/lib/hooks/useRemboursements'
import { formatDate, formatEuro } from '@/lib/utils'

const actions = [
  { key: 'income', label: 'Revenu', icon: ArrowUpCircle, tone: 'text-emerald-300 bg-emerald-500/10' },
  { key: 'fixed', label: 'Charge fixe', icon: CalendarClock, tone: 'text-indigo-300 bg-indigo-500/10' },
  { key: 'expense', label: 'Dépense variable', icon: ReceiptText, tone: 'text-cyan-300 bg-cyan-500/10' },
  { key: 'saving', label: 'Mouvement d’épargne', icon: PiggyBank, tone: 'text-amber-300 bg-amber-500/10' },
  { key: 'refund', label: 'Remboursement', icon: RotateCcw, tone: 'text-emerald-300 bg-emerald-500/10' },
] as const

type ActionKey = typeof actions[number]['key']

export default function DashboardQuickAdd() {
  const { moisId, month, espace, isAdminViewing } = useApp()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeForm, setActiveForm] = useState<ActionKey | null>(null)
  const [selectedRefundTx, setSelectedRefundTx] = useState<any>(null)

  const { data: revenus = [], create: createIncome } = useRevenus(moisId)
  const { create: createRecurringIncome } = useRevenusRecurrents(espace?.id)
  const { data: fixedCharges = [], create: createFixed } = useChargesFixes(moisId)
  const { create: createFixedRecurring } = useChargesFixesRecurrentes(espace?.id)
  const { data: transactions = [], create: createTx, split } = useTransactions(moisId)
  const { data: categories = [], create: createCat } = useCategories(espace?.id)
  const { data: envelopes = [], create: createEnvelope } = useEnveloppes(espace?.id)
  const { create: createSaving } = useMouvements(moisId)
  const { create: createRecurringSaving } = useEpargneRecurrentes(espace?.id)
  const reimbursements = useRemboursements(selectedRefundTx?.id)

  useEffect(() => setMounted(true), [])

  const choose = (key: ActionKey) => {
    setOpen(false)
    setActiveForm(key)
  }

  const createIncomeHandler = async (values: { nom: string; montant: number; type: 'actif' | 'passif'; frequence: number; datePrevue: string | null }) => {
    if (!moisId || !espace) return
    let recurrentId: string | null = null
    if (values.frequence > 0) {
      const recurrent = await createRecurringIncome.mutateAsync({
        espace_id: espace.id,
        type: values.type,
        nom: values.nom,
        montant: values.montant,
        actif: true,
        frequence_mois: values.frequence,
        ordre: revenus.length,
        mois_debut: month,
      })
      recurrentId = recurrent.id
    }
    await createIncome.mutateAsync({
      mois_id: moisId,
      recurrent_id: recurrentId,
      type: values.type,
      nom: values.nom,
      montant: values.montant,
      recu: false,
      date_prevue: values.datePrevue,
      ordre: revenus.length,
    })
    setActiveForm(null)
  }

  const createFixedHandler = async (values: { nom: string; montant: number; frequence: number }) => {
    if (!moisId || !espace) return
    const recurrent = await createFixedRecurring.mutateAsync({
      espace_id: espace.id,
      nom: values.nom,
      montant: values.montant,
      categorie_id: null,
      sous_categorie_id: null,
      actif: true,
      frequence_mois: Math.max(1, values.frequence),
      ordre: fixedCharges.length,
      mois_debut: month,
    })
    await createFixed.mutateAsync({
      mois_id: moisId,
      recurrent_id: recurrent.id,
      nom: values.nom,
      montant: values.montant,
      categorie_id: null,
      sous_categorie_id: null,
      payee: false,
      ordre: fixedCharges.length,
    })
    setActiveForm(null)
  }

  const createExpenseHandler = async (data: any) => {
    if (!moisId) return
    await createTx.mutateAsync({ mois_id: moisId, ...data })
    setActiveForm(null)
  }

  const createSplitExpenseHandler = async (data: any, lines: any[]) => {
    if (!moisId) return
    const parent = await createTx.mutateAsync({ mois_id: moisId, ...data })
    await split.mutateAsync({ parentId: parent.id, lines })
    setActiveForm(null)
  }

  const createEnvelopeInline = async (name: string) => {
    if (!espace) throw new Error('Espace indisponible')
    const created = await createEnvelope.mutateAsync({
      espace_id: espace.id,
      nom: name,
      solde_initial: 0,
      solde: 0,
      objectif: null,
      ordre: envelopes.length,
    })
    return { id: created.id }
  }

  const createSavingHandler = async (data: { type: 'epargne' | 'reprise' | 'transfert'; montant: number; note: string | null; sourceId: string | null; destId: string | null; frequence: number; date: string }) => {
    if (!moisId || !espace) return
    if (data.frequence > 0 && data.type === 'epargne' && data.destId) {
      const recurrent = await createRecurringSaving.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: data.destId,
        montant: data.montant,
        actif: true,
        frequence_mois: data.frequence,
        mois_debut: month,
        note: data.note,
        ordre: 0,
      })
      await createSaving.mutateAsync({
        mois_id: moisId,
        recurrent_id: recurrent.id,
        enveloppe_source_id: null,
        enveloppe_dest_id: data.destId,
        montant: data.montant,
        type: 'epargne',
        date: data.date || month,
        note: data.note,
      })
    } else {
      await createSaving.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        enveloppe_source_id: data.sourceId,
        enveloppe_dest_id: data.destId,
        montant: data.montant,
        type: data.type,
        date: data.date || month,
        note: data.note,
      })
    }
    setActiveForm(null)
  }

  if (!mounted || !moisId || isAdminViewing) return null

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer les actions rapides"
          className="fixed inset-0 z-40 bg-black/25"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-end gap-2 px-4 md:bottom-5">
        {open && actions.map(({ key, label, icon: Icon, tone }) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg"
          >
            {label}
            <span className={'flex h-9 w-9 items-center justify-center rounded-full ' + tone}>
              <Icon className="h-4 w-4" />
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
          aria-label="Ajouter"
          aria-expanded={open}
        >
          <Plus className={'h-6 w-6 transition-transform ' + (open ? 'rotate-45' : '')} />
        </button>
      </div>

      <RevenuForm open={activeForm === 'income'} onOpenChange={value => { if (!value) setActiveForm(null) }} onSubmit={createIncomeHandler} />
      <ChargeFixeForm
        open={activeForm === 'fixed'}
        onOpenChange={value => { if (!value) setActiveForm(null) }}
        onSubmit={createFixedHandler}
      />
      <DepenseForm
        open={activeForm === 'expense'}
        onOpenChange={value => { if (!value) setActiveForm(null) }}
        categories={categories}
        espaceId={espace?.id}
        createCat={createCat}
        doubleDate={espace?.double_date ?? false}
        subcategoriesEnabled={espace?.features?.subcategories !== false}
        splitEnabled={espace?.features?.split_transactions !== false}
        onSubmit={createExpenseHandler}
        onSubmitSplit={espace?.features?.split_transactions !== false ? createSplitExpenseHandler : undefined}
      />
      <MouvementForm
        open={activeForm === 'saving'}
        onOpenChange={value => { if (!value) setActiveForm(null) }}
        enveloppesActives={envelopes.filter((env: any) => !env.archived)}
        onCreateEnvelope={createEnvelopeInline}
        initialDate={month.slice(0, 10)}
        onSubmit={createSavingHandler}
      />

      <QuickReimbursementPicker
        open={activeForm === 'refund'}
        onOpenChange={value => { if (!value) setActiveForm(null) }}
        transactions={transactions}
        onSelect={tx => {
          setSelectedRefundTx(tx)
          setActiveForm(null)
        }}
      />

      {selectedRefundTx && (
        <RemboursementDialog
          tx={selectedRefundTx}
          reimbursements={reimbursements.data || []}
          onClose={() => setSelectedRefundTx(null)}
          onCreate={data => reimbursements.create.mutateAsync(data).then(() => undefined)}
          onRemove={id => reimbursements.remove.mutateAsync(id)}
        />
      )}
    </>,
    document.body,
  )
}

function QuickReimbursementPicker({
  open,
  onOpenChange,
  transactions,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: any[]
  onSelect: (tx: any) => void
}) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const eligible = useMemo(() => {
    return transactions
      .filter(tx => !tx.parent_transaction_id)
      .map(tx => {
        const refunded = (tx.remboursements || []).reduce((sum: number, item: any) => sum + Number(item.montant), 0)
        return { ...tx, refunded, remaining: Math.max(0, Number(tx.montant) - refunded) }
      })
      .filter(tx => tx.remaining > 0.005)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [transactions])

  const term = search.trim().toLocaleLowerCase('fr')
  const filtered = eligible.filter(tx => {
    if (!term) return true
    const haystack = [
      tx.infos,
      tx.categorie?.nom,
      tx.sous_categorie?.nom,
      String(tx.montant),
      String(tx.remaining),
    ].filter(Boolean).join(' ').toLocaleLowerCase('fr')
    return haystack.includes(term)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter un remboursement</DialogTitle>
          <DialogDescription>Choisissez la dépense concernée. Les dépenses récentes encore remboursables sont proposées en premier.</DialogDescription>
        </DialogHeader>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une dépense, catégorie ou montant…" className="pl-9" />
        </label>

        <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-600">Aucune dépense remboursable ne correspond.</p>
          ) : filtered.slice(0, 20).map(tx => (
            <button
              key={tx.id}
              type="button"
              onClick={() => onSelect(tx)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-left transition hover:border-slate-700 hover:bg-slate-950/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-lg">{tx.categorie?.icone || '📦'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-200">{tx.infos || tx.sous_categorie?.nom || tx.categorie?.nom || 'Dépense'}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{tx.categorie?.nom || 'Sans catégorie'}{tx.sous_categorie?.nom ? ' · ' + tx.sous_categorie.nom : ''} · {formatDate(tx.date)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-slate-200">{formatEuro(Number(tx.montant))}</span>
                {tx.refunded > 0 && <span className="block text-[10px] text-emerald-400">{formatEuro(tx.remaining)} restant</span>}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
