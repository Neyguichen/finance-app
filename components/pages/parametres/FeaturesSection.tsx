'use client'

import { Bell, CalendarClock, CheckSquare2, Upload } from 'lucide-react'
import type { Espace } from '@/lib/types'

type FeatureKey = 'import_csv' | 'todo' | 'notifications'

const definitions: Array<{
  key: FeatureKey
  label: string
  description: string
  icon: any
}> = [
  {
    key: 'import_csv',
    label: 'Import CSV',
    description: 'Importer et rapprocher des relevés bancaires.',
    icon: Upload,
  },
  {
    key: 'todo',
    label: 'Todo',
    description: 'Centraliser les actions financières à traiter.',
    icon: CheckSquare2,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Afficher les alertes automatiques et le centre de notifications.',
    icon: Bell,
  },
]

export default function FeaturesSection({
  espace,
  onUpdate,
}: {
  espace: Espace | null
  onUpdate: (features: NonNullable<Espace['features']>) => Promise<void>
}) {
  if (!espace) return <p className="text-sm text-slate-500">Aucun Budget sélectionné.</p>

  const features = {
    import_csv: true,
    todo: true,
    notifications: true,
    ...(espace.features || {}),
  }

  const setFeature = async (key: FeatureKey, value: boolean) => {
    await onUpdate({ ...features, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
          <p className="text-xs text-slate-500">
            Ces réglages sont propres au Budget <strong className="text-slate-300">{espace.nom}</strong>.
            Désactiver un module masque son accès sans supprimer ses données.
          </p>
        </div>
      </div>

      {definitions.map(definition => {
        const Icon = definition.icon
        const checked = features[definition.key] !== false
        return (
          <label
            key={definition.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3 sm:items-center"
          >
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200">{definition.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{definition.description}</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary mt-0.5 shrink-0 sm:mt-0"
              checked={checked}
              onChange={event => setFeature(definition.key, event.target.checked)}
            />
          </label>
        )
      })}
    </div>
  )
}
