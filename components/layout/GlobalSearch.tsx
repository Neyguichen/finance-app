'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  HandCoins,
  PiggyBank,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Undo2,
  WalletCards,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import { useGlobalSearch, type GlobalSearchResult } from '@/lib/hooks/useGlobalSearch'
import { formatDate, formatEuro } from '@/lib/utils'

const kindMeta = {
  income: { label: 'Revenu', icon: ArrowUpCircle, tone: 'text-emerald-300 bg-emerald-500/10' },
  fixed: { label: 'Charge fixe', icon: CalendarClock, tone: 'text-indigo-300 bg-indigo-500/10' },
  expense: { label: 'Dépense', icon: ReceiptText, tone: 'text-cyan-300 bg-cyan-500/10' },
  reimbursement: { label: 'Remboursement', icon: Undo2, tone: 'text-emerald-300 bg-emerald-500/10' },
  debt: { label: 'Dette / créance', icon: HandCoins, tone: 'text-rose-300 bg-rose-500/10' },
  envelope: { label: 'Enveloppe', icon: WalletCards, tone: 'text-amber-300 bg-amber-500/10' },
  saving: { label: 'Épargne', icon: PiggyBank, tone: 'text-violet-300 bg-violet-500/10' },
} satisfies Record<GlobalSearchResult['kind'], { label: string; icon: typeof Search; tone: string }>


type SearchFilter = 'all' | GlobalSearchResult['kind']

const filterOptions: Array<{ value: SearchFilter; label: string }> = [
  { value: 'all', label: 'Tout' },
  { value: 'income', label: 'Revenus' },
  { value: 'fixed', label: 'Charges fixes' },
  { value: 'expense', label: 'Dépenses' },
  { value: 'reimbursement', label: 'Remboursements' },
  { value: 'debt', label: 'Dettes / créances' },
  { value: 'envelope', label: 'Enveloppes' },
  { value: 'saving', label: 'Épargne' },
]

function SearchFilters({
  value,
  onChange,
}: {
  value: SearchFilter
  onChange: (value: SearchFilter) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800/80 px-2 py-2 scrollbar-none">
      {filterOptions.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ' +
            (value === option.value
              ? 'border-indigo-500 bg-indigo-500 text-white'
              : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:border-slate-700 hover:text-slate-300')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SearchResults({
  results,
  loading,
  query,
  onSelect,
}: {
  results: GlobalSearchResult[]
  loading: boolean
  query: string
  onSelect: (result: GlobalSearchResult) => void
}) {
  if (query.trim().length < 2) {
    return (
      <div className="px-4 py-7 text-center">
        <Search className="mx-auto h-6 w-6 text-slate-700" />
        <p className="mt-2 text-sm text-slate-500">Saisissez au moins 2 caractères.</p>
        <p className="mt-1 text-xs text-slate-700">Nom, catégorie, note, personne ou montant.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center px-4 py-8"><span className="loading loading-spinner loading-sm text-indigo-400" /></div>
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-400">Aucun résultat</p>
        <p className="mt-1 text-xs text-slate-600">Essayez un libellé, une catégorie ou un montant.</p>
      </div>
    )
  }

  return (
    <div className="max-h-[min(62vh,520px)] overflow-y-auto p-2">
      {results.map(result => {
        const meta = kindMeta[result.kind]
        const Icon = meta.icon
        return (
          <button
            key={result.kind + ':' + result.id}
            type="button"
            onClick={() => onSelect(result)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-800/65"
          >
            <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' + meta.tone}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-200">{result.title}</span>
                <span className="shrink-0 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{meta.label}</span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">{result.subtitle}</span>
            </span>
            <span className="shrink-0 text-right">
              {result.amount != null && <span className="block text-xs font-semibold text-slate-300">{formatEuro(result.amount)}</span>}
              {result.date && <span className="mt-0.5 block text-[10px] text-slate-600">{formatDate(result.date)}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function GlobalSearch() {
  const router = useRouter()
  const { espace, setMonth, isAdminViewing } = useApp()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [filter, setFilter] = useState<SearchFilter>('all')
  const desktopRef = useRef<HTMLDivElement>(null)
  const search = useGlobalSearch(!isAdminViewing ? espace?.id : undefined, debounced)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query), 180)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (window.innerWidth < 768) setMobileOpen(true)
        else setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const results = useMemo(() => {
    const all = search.data || []
    return filter === 'all' ? all : all.filter(result => result.kind === filter)
  }, [search.data, filter])

  const selectResult = (result: GlobalSearchResult) => {
    if (result.month) setMonth(result.month)
    setOpen(false)
    setMobileOpen(false)
    setQuery('')
    setFilter('all')
    router.push(result.href)
  }

  if (isAdminViewing) return null

  return (
    <>
      <div ref={desktopRef} className="relative hidden w-full max-w-xl md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          placeholder="Rechercher dans vos finances…"
          className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950/55 pl-9 pr-16 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/70 focus:bg-slate-950"
          aria-label="Recherche globale"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-600">⌘K</span>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1627] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-slate-800/80 px-3 py-2 text-[10px] font-medium text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtrer les résultats
            </div>
            <SearchFilters value={filter} onChange={setFilter} />
            <SearchResults results={results} loading={search.isFetching} query={query} onSelect={selectResult} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white md:hidden"
        aria-label="Rechercher"
      >
        <Search className="h-5 w-5" />
      </button>

      {mobileOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] bg-[#08111f] md:hidden">
          <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-3">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher revenus, dépenses…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="rounded-lg p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setMobileOpen(false)} className="text-xs font-medium text-indigo-300">Fermer</button>
          </div>
          <SearchFilters value={filter} onChange={setFilter} />
          <SearchResults results={results} loading={search.isFetching} query={query} onSelect={selectResult} />
        </div>,
        document.body,
      )}
    </>
  )
}
