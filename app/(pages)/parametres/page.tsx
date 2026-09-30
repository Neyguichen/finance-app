'use client'

import { useState, useEffect, useMemo } from 'react'
import { User, Wallet, FolderOpen, Palette, Download, Trash2, UserX, BarChart3, Repeat2, Settings, SlidersHorizontal } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'

import Section from '@/components/pages/parametres/Section'
import ProfilSection from '@/components/pages/parametres/ProfilSection'
import EspacesSection from '@/components/pages/parametres/EspacesSection'
import CategoriesSection from '@/components/pages/parametres/CategoriesSection'
import StatsSection from '@/components/pages/parametres/StatsSection'
import HabitudesSection from '@/components/pages/parametres/HabitudesSection'
import ExportSection from '@/components/pages/parametres/ExportSection'
import DonneesSection from '@/components/pages/parametres/DonneesSection'
import CompteSection from '@/components/pages/parametres/CompteSection'
import FeaturesSection from '@/components/pages/parametres/FeaturesSection'

export default function ParametresPage() {
  const supabase = useMemo(() => createClient(), [])
  const { userId, espaces, espace, updateEspace, removeEspace } = useApp()
  const espaceId = espace?.id
  const { data: categories = [], create: createCat, update: updateCat, remove: removeCat } = useCategories(espaceId)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    profil: false, espaces: false, categories: false, habitudes: false, stats: false, fonctions: false, apparence: false,
    export: false, donnees: false, compte: false,
  })

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section')
    if (section === 'habitudes' || section === 'recurrences') {
      setOpenSections(prev => ({ ...prev, habitudes: true }))
    }
  }, [])

  const toggle = (key: string) => setOpenSections(prev => {
    const allClosed: Record<string, boolean> = {}
    for (const k in prev) allClosed[k] = false
    allClosed[key] = !prev[key]
    return allClosed
  })

  const [userEmail, setUserEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null)
    })
  }, [supabase])

  const { moisId } = useApp()
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4">
      <PageHeader
        eyebrow="Personnalisation"
        title="Paramètres"
        description="Configure ton Budget, tes récurrences, tes catégories et les fonctions que tu souhaites utiliser."
        icon={Settings}
      />

      <Section open={openSections.profil} onToggle={() => toggle('profil')} icon={User} title="Profil" color="text-blue-400">
        <ProfilSection userEmail={userEmail} />
      </Section>

      <Section open={openSections.espaces} onToggle={() => toggle('espaces')} icon={Wallet} title="Budgets" color="text-emerald-400">
        <EspacesSection
          espaces={espaces}
          currentEspaceId={espaceId}
          updateEspace={updateEspace}
          removeEspace={removeEspace}
        />
      </Section>

      <Section open={openSections.categories} onToggle={() => toggle('categories')} icon={FolderOpen} title="Catégories" color="text-purple-400">
        <CategoriesSection
          categories={categories}
          espaceId={espaceId}
          moisId={moisId}
          budgets={budgets}
          createCat={createCat}
          updateCat={updateCat}
          removeCat={removeCat}
          onUpsertBudget={(catId, prevu) => { if (moisId) upsertBudget.mutate({ mois_id: moisId, categorie_id: catId, prevu }) }}
        />
      </Section>

      <Section open={openSections.habitudes} onToggle={() => toggle('habitudes')} icon={Repeat2} title="Récurrences" color="text-indigo-400">
        <HabitudesSection espaceId={espaceId} />
      </Section>

      <Section open={openSections.stats} onToggle={() => toggle('stats')} icon={BarChart3} title="Statistiques" color="text-cyan-400">
        <StatsSection
          dashboardStats={espace?.dashboard_stats ?? null}
          onUpdate={async (stats) => {
            if (!espace) return
            await updateEspace(espace.id, { dashboard_stats: stats })
          }}
        />
      </Section>

      <Section open={openSections.fonctions} onToggle={() => toggle('fonctions')} icon={SlidersHorizontal} title="Fonctionnalités du Budget" color="text-fuchsia-400">
        <FeaturesSection
          espace={espace}
          onUpdate={async (features) => {
            if (!espace) return
            await updateEspace(espace.id, { features })
          }}
        />
      </Section>

      <Section open={openSections.apparence} onToggle={() => toggle('apparence')} icon={Palette} title="Apparence" color="text-amber-400">
        <p className="text-sm text-slate-500">🚧 Le thème clair sera disponible dans une future version. L&apos;app utilise actuellement des couleurs en dur qui nécessitent un refactoring pour supporter les thèmes.</p>
      </Section>

      <Section open={openSections.export} onToggle={() => toggle('export')} icon={Download} title="Exporter les données" color="text-teal-400">
        <ExportSection espaceId={espaceId} espaceNom={espace?.nom} />
      </Section>

      <Section open={openSections.donnees} onToggle={() => toggle('donnees')} icon={Trash2} title="Gestion des données" color="text-orange-400">
        <DonneesSection espaceId={espaceId} espaceNom={espace?.nom} />
      </Section>

      <Section open={openSections.compte} onToggle={() => toggle('compte')} icon={UserX} title="Supprimer mon compte" color="text-red-400">
        <CompteSection userId={userId} />
      </Section>
    </div>
  )
}