'use client'

import { CalendarCheck2, CheckSquare2, Layers3, ReceiptText, Scissors } from 'lucide-react'
import type { Espace } from '@/lib/types'

type FeatureKey = 'todo' | 'subcategories' | 'split_transactions' | 'reimbursements'

const groups: Array<{
  title: string
  items: Array<{ key: FeatureKey; label: string; description: string; icon: any }>
}> = [
  {
    title: 'Dépenses',
    items: [
      { key: 'subcategories', label: 'Sous-catégories', description: 'Afficher et utiliser les sous-catégories dans les dépenses.', icon: Layers3 },
      { key: 'split_transactions', label: 'Transactions divisées', description: 'Ventiler une même dépense sur plusieurs catégories.', icon: Scissors },
      { key: 'reimbursements', label: 'Remboursements', description: 'Suivre les remboursements liés à une dépense.', icon: ReceiptText },
    ],
  },
  {
    title: 'Modules',
    items: [
      { key: 'todo', label: 'Todo', description: 'Afficher les tâches financières et leur accès dans l’application.', icon: CheckSquare2 },
    ],
  },
]

export default function FeaturesSection({
  espace,
  onUpdate,
  onUpdateDoubleDate,
}: {
  espace: Espace | null
  onUpdate: (features: NonNullable<Espace['features']>) => Promise<void>
  onUpdateDoubleDate: (value: boolean) => Promise<void>
}) {
  if (!espace) return <p className="text-sm text-slate-500">Aucun Budget sélectionné.</p>

  const features = {
    todo: true,
    subcategories: true,
    split_transactions: true,
    reimbursements: true,
    ...(espace.features || {}),
  }

  const setFeature = async (key: FeatureKey, value: boolean) => {
    await onUpdate({ ...features, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3 text-xs text-slate-500">
        Ces réglages sont propres au Budget <strong className="text-slate-300">{espace.nom}</strong>. Désactiver une fonctionnalité masque son utilisation sans supprimer les données existantes.
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dates & validation</h3>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <CalendarCheck2 className="h-4 w-4 shrink-0 text-indigo-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200">Date de validation bancaire</p>
            <p className="mt-0.5 text-xs text-slate-500">Saisir séparément la date de paiement et la date de validation bancaire.</p>
          </div>
          <input type="checkbox" className="toggle toggle-sm toggle-primary shrink-0" checked={!!espace.double_date} onChange={event => onUpdateDoubleDate(event.target.checked)} />
        </label>
      </section>

      {groups.map(group => (
        <section key={group.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h3>
          <div className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/25">
            {group.items.map(definition => {
              const Icon = definition.icon
              const checked = features[definition.key] !== false
              return (
                <label key={definition.key} className="flex cursor-pointer items-center gap-3 p-3 transition hover:bg-slate-800/25">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">{definition.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{definition.description}</p>
                  </div>
                  <input type="checkbox" className="toggle toggle-sm toggle-primary shrink-0" checked={checked} onChange={event => setFeature(definition.key, event.target.checked)} />
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
