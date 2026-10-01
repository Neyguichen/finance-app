'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell, ChevronLeft, ChevronRight, Download, LockKeyhole, Palette, Search,
  Settings, SlidersHorizontal, User, Users, Wallet,
} from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { createClient } from '@/lib/supabase/client'
import ProfilSection from '@/components/pages/parametres/ProfilSection'
import EspacesSection from '@/components/pages/parametres/EspacesSection'
import FeaturesSection from '@/components/pages/parametres/FeaturesSection'
import ExportSection from '@/components/pages/parametres/ExportSection'
import DonneesSection from '@/components/pages/parametres/DonneesSection'
import CompteSection from '@/components/pages/parametres/CompteSection'

type SettingsKey = 'profile' | 'budgets' | 'features' | 'notifications' | 'appearance' | 'sharing' | 'import-export' | 'data'

const items: Array<{
  key: SettingsKey
  label: string
  description: string
  icon: any
  color: string
}> = [
  { key:'profile', label:'Mon profil', description:'Informations personnelles et sécurité', icon:User, color:'text-indigo-300' },
  { key:'budgets', label:'Budgets', description:'Gérer vos budgets et leurs réglages', icon:Wallet, color:'text-amber-300' },
  { key:'features', label:'Fonctionnalités', description:'Personnaliser les fonctions de ce budget', icon:SlidersHorizontal, color:'text-sky-300' },
  { key:'notifications', label:'Notifications', description:'Alertes et communications', icon:Bell, color:'text-rose-300' },
  { key:'appearance', label:'Apparence', description:'Thème et préférences d’affichage', icon:Palette, color:'text-violet-300' },
  { key:'sharing', label:'Partage & membres', description:'Collaboration autour du budget', icon:Users, color:'text-fuchsia-300' },
  { key:'import-export', label:'Import / Export', description:'Import bancaire et sauvegarde', icon:Download, color:'text-cyan-300' },
  { key:'data', label:'Données & confidentialité', description:'Sécurité et gestion de vos données', icon:LockKeyhole, color:'text-blue-300' },
]

export default function ParametresPage() {
  const supabase = useMemo(() => createClient(), [])
  const { userId, espaces, espace, updateEspace, removeEspace } = useApp()
  const [active, setActive] = useState<SettingsKey>('budgets')
  const [mobileDetail, setMobileDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section')
    const alias: Record<string, SettingsKey> = {
      profil:'profile', profile:'profile', budgets:'budgets', espaces:'budgets',
      fonctions:'features', features:'features', habitudes:'features', recurrences:'features',
      notifications:'notifications', apparence:'appearance', export:'import-export',
      import:'import-export', donnees:'data', compte:'data',
    }
    if (section && alias[section]) {
      setActive(alias[section])
      setMobileDetail(true)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null))
  }, [supabase])

  const filteredItems = items.filter(item => {
    const q = search.trim().toLowerCase()
    return !q || item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  })

  const current = items.find(item => item.key === active) || items[0]

  const selectSection = (key: SettingsKey) => {
    setActive(key)
    setMobileDetail(true)
    const url = new URL(window.location.href)
    url.searchParams.set('section', key)
    window.history.replaceState({}, '', url)
  }

  const content = {
    profile: <ProfilSection userEmail={userEmail} />,
    budgets: <EspacesSection espaces={espaces} currentEspaceId={espace?.id} updateEspace={updateEspace} removeEspace={removeEspace} />,
    features: <FeaturesSection
      espace={espace}
      onUpdate={async features => { if (espace) await updateEspace(espace.id, { features }) }}
      onUpdateDoubleDate={async value => { if (espace) await updateEspace(espace.id, { double_date: value }) }}
    />,
    notifications: <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
        <p className="text-sm font-medium text-slate-200">Centre de notifications</p>
        <p className="mt-1 text-xs text-slate-500">Consultez les alertes financières générées pour votre budget.</p>
        <Link href="/notifications" className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-300">Ouvrir les notifications <ChevronRight className="h-3.5 w-3.5" /></Link>
      </div>
      <p className="text-xs text-slate-500">L’activation générale des notifications se règle dans Fonctionnalités.</p>
    </div>,
    appearance: <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><p className="text-sm font-medium text-slate-200">Thème sombre</p><p className="mt-1 text-xs text-slate-500">Le thème actuel reste la référence visuelle. Le thème clair sera ajouté lorsque l’ensemble des composants sera compatible.</p></div>,
    sharing: <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/20 p-5"><p className="text-sm font-medium text-slate-300">Partage & membres</p><p className="mt-1 text-xs text-slate-500">Cette section est prête dans la navigation, mais la gestion collaborative n’est pas encore activée. Aucun faux contrôle n’est affiché tant que le partage réel n’est pas câblé.</p></div>,
    'import-export': <div className="space-y-4">
      {espace?.features?.import_csv !== false && <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><p className="text-sm font-medium text-slate-200">Import bancaire</p><p className="mt-1 text-xs text-slate-500">Importez un relevé CSV et rapprochez les opérations avec vos données.</p><Link href="/import-csv" className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-300">Importer un fichier <ChevronRight className="h-3.5 w-3.5" /></Link></div>}
      <ExportSection espaceId={espace?.id} espaceNom={espace?.nom} />
    </div>,
    data: <div className="space-y-5"><DonneesSection espaceId={espace?.id} espaceNom={espace?.nom} /><div className="border-t border-slate-800 pt-5"><CompteSection userId={userId} /></div></div>,
  } satisfies Record<SettingsKey, React.ReactNode>

  return (
    <div className="mx-auto w-full max-w-7xl p-3 pb-24 sm:p-4">
      <div className="mb-4 hidden items-end justify-between gap-4 md:flex">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Paramètres</h1>
          <p className="mt-1 text-sm text-slate-500">Personnalisez votre expérience et configurez vos budgets selon vos besoins.</p>
        </div>
        <label className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un paramètre…" className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400" />
        </label>
      </div>

      <div className="md:hidden">
        {!mobileDetail ? (
          <>
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-100">Paramètres</h1>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un paramètre…" className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400" />
            </label>
            <div className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
              {filteredItems.map(item => {
                const Icon=item.icon
                return <button key={item.key} type="button" onClick={() => selectSection(item.key)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-800/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/50"><Icon className={'h-5 w-5 ' + item.color} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{item.label}</p><p className="truncate text-[11px] text-slate-500">{item.description}</p></div>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              })}
            </div>
          </>
        ) : (
          <div>
            <button type="button" onClick={() => setMobileDetail(false)} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400"><ChevronLeft className="h-4 w-4" />Paramètres</button>
            <div className="mb-3"><h2 className="text-xl font-semibold text-slate-100">{current.label}</h2><p className="mt-1 text-xs text-slate-500">{current.description}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">{content[active]}</div>
          </div>
        )}
      </div>

      <div className="hidden grid-cols-[230px_1fr] gap-3 md:grid">
        <aside className="h-fit overflow-hidden rounded-xl border border-slate-800 bg-slate-900/65 p-1.5">
          {filteredItems.map(item => {
            const Icon=item.icon
            const selected=item.key===active
            return <button key={item.key} type="button" onClick={() => selectSection(item.key)} className={'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ' + (selected ? 'bg-indigo-600/25 text-white ring-1 ring-inset ring-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/45 hover:text-slate-200')}>
              <Icon className={'h-4 w-4 shrink-0 ' + (selected ? item.color : 'text-slate-500')} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          })}
        </aside>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800/70 px-5 py-4">
            <h2 className="text-xl font-semibold text-slate-100">{current.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{current.description}</p>
          </div>
          <div className="p-5">{content[active]}</div>
        </section>
      </div>
    </div>
  )
}
