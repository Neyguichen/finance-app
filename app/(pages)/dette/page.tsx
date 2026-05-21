'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import DetteResume from '@/components/pages/dette/DetteResume'
import DetteForm from '@/components/pages/dette/DetteForm'
import DetteDetail from '@/components/pages/dette/DetteDetail'

import { useDettes } from '@/lib/hooks/useDettes'
import type { Dette } from '@/lib/types'

export default function DettePage() {
  const { espace } = useApp()
  const {
    data: dettes = [], create, remboursements,
    update, addRemboursement, removeRemboursement, updateRemboursement,
    archive, unarchive,
  } = useDettes(espace?.id)

  const [tab, setTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openAdd, setOpenAdd] = useState(false)

  const rembData = remboursements?.data || []

  // Helper reste après remboursements
  const getReste = (dette: Dette) => {
    const rembs = rembData.filter(r => r.dette_id === dette.id)
    const totalRemb = rembs.reduce((s, r) => s + Number(r.montant), 0)
    return Number(dette.montant) - totalRemb
  }

  const totalJeDois = dettes.filter(d => d.type === 'je_dois' && !d.archived).reduce((s, d) => s + getReste(d), 0)
  const totalJaiPrete = dettes.filter(d => d.type === 'jai_prete' && !d.archived).reduce((s, d) => s + getReste(d), 0)

  const dettesActives = dettes.filter(d => !d.archived && d.type === tab)
  const dettesArchivees = dettes.filter(d => d.archived && d.type === tab)

  const handleAdd = async (data: {
    titre: string; description: string | null; personne: string;
    montant: number; date_echeance: string | null
  }) => {
    if (!espace) return
    await create.mutateAsync({ espace_id: espace.id, type: tab, ...data })
    setOpenAdd(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dettes</h1>
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />Ajouter
        </Button>
      </div>

      <DetteForm open={openAdd} onOpenChange={setOpenAdd} tab={tab} onSubmit={handleAdd} />

      <DetteResume totalJeDois={totalJeDois} totalJaiPrete={totalJaiPrete} />

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab('je_dois')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'je_dois' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}>Je dois</button>
        <button onClick={() => setTab('jai_prete')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'jai_prete' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}>J&apos;ai prêté</button>
      </div>

      {/* Liste des dettes actives */}
      <div className="space-y-3">
        {dettesActives.length === 0 && dettesArchivees.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">
            {tab === 'je_dois' ? 'Aucune dette enregistrée 🎉' : 'Aucun prêt enregistré'}
          </p>
        )}

        {dettesActives.map(dette => (
          <DetteDetail
            key={dette.id}
            dette={dette}
            rembList={rembData.filter(r => r.dette_id === dette.id)}
            onUpdate={(data) => update.mutate(data)}
            onAddRemboursement={(data) => addRemboursement.mutate(data)}
            onRemoveRemboursement={(id) => removeRemboursement.mutate(id)}
            onUpdateRemboursement={(data) => updateRemboursement.mutate(data)}
            onArchive={(id) => archive.mutate(id)}
            onUnarchive={(id) => unarchive.mutate(id)}
          />
        ))}
      </div>

      {/* Archives */}
      {dettesArchivees.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-500 cursor-pointer">
            📦 Archives ({dettesArchivees.length})
          </summary>
          <div className="space-y-2 mt-2">
            {dettesArchivees.map(dette => (
              <DetteDetail
                key={dette.id}
                dette={dette}
                rembList={rembData.filter(r => r.dette_id === dette.id)}
                onUpdate={(data) => update.mutate(data)}
                onAddRemboursement={(data) => addRemboursement.mutate(data)}
                onRemoveRemboursement={(id) => removeRemboursement.mutate(id)}
                onUpdateRemboursement={(data) => updateRemboursement.mutate(data)}
                onArchive={(id) => archive.mutate(id)}
                onUnarchive={(id) => unarchive.mutate(id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}