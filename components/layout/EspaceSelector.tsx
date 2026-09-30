'use client'

import { useApp } from '@/components/AppContext'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

export default function EspaceSelector() {
  const { espaces, espace, setEspaceId, isAdminViewing } = useApp()
  const pathname = usePathname()

  if (pathname === '/login') return null

  if (isAdminViewing) {
    return (
      <div className="nf-chip border-rose-400/20 bg-rose-500/10 text-rose-200">
        <span aria-hidden="true">👁️</span>
        <span>Vue administrateur</span>
      </div>
    )
  }

  if (!espace) return null

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">Budget actif</span>
      <select
        value={espace.id}
        onChange={event => setEspaceId(event.target.value)}
        className="h-9 max-w-[11.5rem] appearance-none truncate rounded-xl border border-slate-700/70 bg-slate-950/55 py-1 pl-3 pr-8 text-sm font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400/60 sm:max-w-[16rem]"
      >
        {espaces.map(item => (
          <option key={item.id} value={item.id}>
            {item.icone} {item.nom}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-500" />
    </label>
  )
}
