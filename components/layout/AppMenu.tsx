'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { useDbUsage } from '@/lib/hooks/useDbUsage'
import { CircleHelp, Database, Info, LogOut, Menu, Scale, Upload, Users, X } from 'lucide-react'
import { isAdmin } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'

export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { userId, espace } = useApp()
  const { data: dbUsage } = useDbUsage()
  const features = {
    import_csv: true,
    ...(espace?.features || {}),
  }

  useEffect(() => setMounted(true), [])

  const closeMenu = () => setOpen(false)

  const go = (href: string) => {
    closeMenu()
    router.push(href)
  }

  const handleLogout = async () => {
    closeMenu()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const portal = (
    <>
      {open && <div className="fixed inset-0 z-[9999] bg-black/55" onClick={closeMenu} />}
      <div
        className={`fixed top-0 z-[10000] flex h-full w-[min(20rem,100vw)] flex-col border-l border-slate-800/80 bg-[#0a1424] shadow-2xl transition-[right] duration-300 ease-in-out ${open ? 'right-0' : 'right-[-20rem]'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 p-4">
          <div>
            <p className="nf-eyebrow">Neyguichen Finances</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">Menu</h2>
          </div>
          <button onClick={closeMenu} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800/70 hover:text-white" aria-label="Fermer le menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4 pb-6">
          {isAdmin(userId) && <MenuLink icon={Users} label="Admin" onClick={() => go('/admin')} />}

          <MenuLink icon={Scale} label="Vérifier le solde" onClick={() => go('/verification-solde')} />

          {features.import_csv !== false && (
            <MenuLink icon={Upload} label="Importer un CSV" onClick={() => go('/import-csv')} />
          )}

          <MenuLink icon={CircleHelp} label="Aide et retours" onClick={() => go('/aide')} />
          <MenuLink icon={Info} label="À propos" onClick={() => go('/a-propos')} />
          <MenuLink icon={LogOut} label="Se déconnecter" danger onClick={handleLogout} />
        </div>

        <div className="shrink-0 border-t border-slate-800 px-4 py-4 text-center">
          {dbUsage && (
            <div className="mb-3 space-y-2 rounded-lg bg-slate-800/60 p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Base de données</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{dbUsage.size_mb} Mo / {dbUsage.limit_mb} Mo</span>
                <span className={`font-bold ${dbUsage.percent > 80 ? 'text-red-400' : dbUsage.percent > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {dbUsage.percent}%
                </span>
              </div>
              <progress
                className={`progress h-2 w-full ${dbUsage.percent > 80 ? 'progress-error' : dbUsage.percent > 60 ? 'progress-warning' : 'progress-success'}`}
                value={dbUsage.percent}
                max={100}
              />
            </div>
          )}
          <span className="text-xs text-slate-600">Neyguichen Finances · v{APP_VERSION}</span>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
        aria-expanded={open}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mounted && createPortal(portal, document.body)}
    </>
  )
}

function MenuLink({ icon: Icon, label, onClick, danger }: {
  icon: any
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${danger ? 'text-red-400 hover:bg-red-950/50' : 'text-slate-300 hover:bg-slate-800/70'}`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}
