'use client'

import { useState, useEffect } from 'react'
import { User, Wallet, FolderOpen, Palette, Download, Trash2, UserX } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { createClient } from '@/lib/supabase/client'

import Section from '@/components/pages/parametres/Section'
import ProfilSection from '@/components/pages/parametres/ProfilSection'
import EspacesSection from '@/components/pages/parametres/EspacesSection'
import CategoriesSection from '@/components/pages/parametres/CategoriesSection'
import ExportSection from '@/components/pages/parametres/ExportSection'
import DonneesSection from '@/components/pages/parametres/DonneesSection'
import CompteSection from '@/components/pages/parametres/CompteSection'

export default function ParametresPage() {
  const supabase = createClient()
  const { userId, espaces, espace, updateEspace, removeEspace, refreshEspaces } = useApp()
  const espaceId = espace?.id
  const { data: categories = [], create: createCat, update: updateCat, remove: removeCat } = useCategories(espaceId)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    profil: false, espaces: true, categories: false, apparence: false,
    export: false, donnees: false, compte: false,
  })
  const toggle = (key: string) => setOpenSections(prev => {
    const allClosed: Record<string, boolean> = {}
    for (const k in prev) allClosed[k] = false
    allClosed[key] = !prev[key] // si déjà ouvert → ferme, sinon → ouvre (seul)
    return allClosed
  })

  const [userEmail, setUserEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null)
    })
  }, [])

  return (
    <div className="p-4 space-y-3 pb-24">
      <h1 className="text-xl font-bold">⚙️ Paramètres</h1>

      <Section open={openSections.profil} onToggle={() => toggle('profil')} icon={User} title="Profil" color="text-blue-400">
        <ProfilSection userEmail={userEmail} />
      </Section>

      <Section open={openSections.espaces} onToggle={() => toggle('espaces')} icon={Wallet} title="Espaces" color="text-emerald-400">
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
          createCat={createCat}
          updateCat={updateCat}
          removeCat={removeCat}
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