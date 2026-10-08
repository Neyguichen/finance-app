'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  value: string
  label: string
  icon?: string | null
  description?: string | null
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Sélectionner…',
  emptyLabel = 'Aucun résultat',
  className,
  disabled = false,
}: {
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr')
    if (!term) return options
    return options.filter(option =>
      (option.label + ' ' + (option.description || '')).toLocaleLowerCase('fr').includes(term),
    )
  }, [options, search])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(current => !current) }}
        disabled={disabled}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 text-left text-sm text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={open}
      >
        {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-slate-200' : 'text-slate-600')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-600 transition', open && 'rotate-180')} />
      </button>

      {open && !disabled && (
        <div className="relative z-[80] mt-1.5 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1627] shadow-2xl shadow-black/40 sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+6px)] sm:mt-0">
          <div className="border-b border-slate-800 p-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher…"
                className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <div className="max-h-[min(42dvh,320px)] min-h-0 touch-pan-y overscroll-contain overflow-y-auto p-1.5 [-webkit-overflow-scrolling:touch] sm:max-h-56">
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-600">{emptyLabel}</p>
            ) : filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  setSearch('')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-800/70"
              >
                <span className="w-5 shrink-0 text-center">{option.icon || '•'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-200">{option.label}</span>
                  {option.description && <span className="block truncate text-[10px] text-slate-600">{option.description}</span>}
                </span>
                {value === option.value && <Check className="h-4 w-4 shrink-0 text-indigo-300" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
