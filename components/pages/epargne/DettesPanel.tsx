'use client'

import { useState } from 'react'
import { Handshake, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DetteResume from '@/components/pages/dette/DetteResume'
import DetteForm from '@/components/pages/dette/DetteForm'
import DetteDetail from '@/components/pages/dette/DetteDetail'
import { useApp } from '@/components/AppContext'
import { useDettes } from '@/lib/hooks/useDettes'
import type { Dette } from '@/lib/types'

export default function DettesPanel() {
  const { espace, isAdminViewing } = useApp()
  const {
    data: dettes = [],
    create,
    remboursements,
    update,
    addRemboursement,
    removeRemboursement,
    updateRemboursement,
    archive,
    unarchive,
  } = useDettes(espace?.id)

  const [tab, setTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openAdd, setOpenAdd] = useState(false)
  const rembData = remboursements?.data || []

  const getReste = (dette: Dette) => {
    const rembs = rembData.filter(remboursement => remboursement.dette_id === dette.id)
    const totalRemb = rembs.reduce((sum, remboursement) => sum + Number(remboursement.montant), 0)
    return Math.max(0, Number(dette.montant) - totalRemb)
  }

  const totalJeDois = dettes
    .filter(dette => dette.type === 'je_dois' && !dette.archived)
    .reduce((sum, dette) => sum + getReste(dette), 0)
  const totalOnMeDoit = dettes
    .filter(dette => dette.type === 'jai_prete' && !dette.archived)
    .reduce((sum, dette) => sum + getReste(dette), 0)

  const active = dettes.filter(dette => !dette.archived && dette.type === tab)
  const archived = dettes.filter(dette => dette.archived && dette.type === tab)

  const handleAdd = async (data: {
    titre: string
    description: string | null
    personne: string
    montant: number
    date_echeance: string | null
  }) => {
    if (!espace || isAdminViewing) return
    await create.mutateAsync({ espace_id: espace.id, type: tab, ...data })
    setOpenAdd(false)
  }

  return (
    <section className="space-y-4">
      <DetteForm open={openAdd} onOpenChange={setOpenAdd} tab={tab} onSubmit={handleAdd} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="nf-eyebrow">Engagements</p>
          <h2 className="text-lg font-semibold">Dettes & créances</h2>
          <p className="mt-1 text-sm text-slate-500">
            Suis ce que tu dois et ce qu’on te doit, sans transformer automatiquement les remboursements en revenus ou dépenses.
          </p>
        </div>
        {!isAdminViewing && (
          <Button size="sm" onClick={() => setOpenAdd(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      <DetteResume totalJeDois={totalJeDois} totalJaiPrete={totalOnMeDoit} />

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/35 p-1">
        <button
          type="button"
          onClick={() => setTab('je_dois')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === 'je_dois' ? 'bg-rose-500/15 text-rose-300' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Je dois
        </button>
        <button
          type="button"
          onClick={() => setTab('jai_prete')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === 'jai_prete' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}
        >
          On me doit
        </button>
      </div>

      <div className="space-y-3">
        {active.length === 0 && archived.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/25 p-6 text-center">
            <Handshake className="mx-auto h-6 w-6 text-slate-700" />
            <p className="mt-2 text-sm text-slate-500">
              {tab === 'je_dois' ? 'Aucune dette enregistrée.' : 'Aucune créance enregistrée.'}
            </p>
          </div>
        )}

        {active.map(dette => (
          <DetteDetail
            key={dette.id}
            dette={dette}
            rembList={rembData.filter(remboursement => remboursement.dette_id === dette.id)}
            onUpdate={data => update.mutateAsync(data)}
            onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)}
            onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)}
            onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)}
            onArchive={id => archive.mutateAsync(id)}
            onUnarchive={id => unarchive.mutateAsync(id)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <details className="rounded-xl border border-slate-800/60 bg-slate-950/20 p-3">
          <summary className="cursor-pointer text-sm text-slate-500">Archives ({archived.length})</summary>
          <div className="mt-3 space-y-2">
            {archived.map(dette => (
              <DetteDetail
                key={dette.id}
                dette={dette}
                rembList={rembData.filter(remboursement => remboursement.dette_id === dette.id)}
                onUpdate={data => update.mutateAsync(data)}
                onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)}
                onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)}
                onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)}
                onArchive={id => archive.mutateAsync(id)}
                onUnarchive={id => unarchive.mutateAsync(id)}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
