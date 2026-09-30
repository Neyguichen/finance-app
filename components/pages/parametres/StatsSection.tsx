'use client'

type StatKey =
  | 'bilanEpargne'
  | 'bilanMoisExtremes'
  | 'bilanGraphRevSortants'
  | 'bilanGraphReste'
  | 'bilanCatVariable'
  | 'bilanTableau'

type StatOption = {
  key: StatKey
  label: string
  icon: string
  desc: string
}

const BILAN_OPTIONS: StatOption[] = [
  { key: 'bilanEpargne', label: 'Épargne nette + taux', icon: '💰', desc: 'Total épargné sur l’année et part rapportée aux revenus.' },
  { key: 'bilanMoisExtremes', label: 'Mois + dépensier / économe', icon: '📈', desc: 'Identifie les mois où tes dépenses ont été les plus hautes et les plus basses.' },
  { key: 'bilanGraphRevSortants', label: 'Revenus vs sorties', icon: '📉', desc: 'Courbe mensuelle comparant les entrées et les sorties.' },
  { key: 'bilanGraphReste', label: 'Résultat mensuel', icon: '💵', desc: 'Évolution du résultat de chaque mois sur l’année.' },
  { key: 'bilanCatVariable', label: 'Catégorie la plus variable', icon: '🔀', desc: 'Met en avant la catégorie dont les dépenses évoluent le plus.' },
  { key: 'bilanTableau', label: 'Tableau des catégories', icon: '📋', desc: 'Total, moyenne, minimum et maximum par catégorie sur l’année.' },
]

const DEFAULT_STATS: Record<StatKey, boolean> = {
  bilanEpargne: true,
  bilanMoisExtremes: true,
  bilanGraphRevSortants: true,
  bilanGraphReste: true,
  bilanCatVariable: true,
  bilanTableau: true,
}

type Props = {
  dashboardStats: Record<string, boolean> | null
  onUpdate: (stats: Record<StatKey, boolean>) => Promise<void>
}

export default function StatsSection({ dashboardStats, onUpdate }: Props) {
  const stats = { ...DEFAULT_STATS, ...dashboardStats } as Record<StatKey, boolean>

  const handleToggle = async (key: StatKey) => {
    await onUpdate({ ...stats, [key]: !stats[key] })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800/70 bg-slate-950/35 p-3">
        <p className="text-sm font-medium text-slate-200">Dashboard mensuel</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Le nouveau résumé mensuel est volontairement cohérent et ne dépend plus des anciens modules V1 activables séparément.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Bilan annuel</p>
        <div className="space-y-2">
          {BILAN_OPTIONS.map(option => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/35 p-3 transition hover:border-slate-700"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{option.icon}</span>
                  <span className="text-sm font-medium text-slate-300">{option.label}</span>
                </div>
                <p className="ml-7 mt-1 text-[11px] leading-5 text-slate-500">{option.desc}</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm mt-0.5 shrink-0"
                checked={stats[option.key]}
                onChange={() => handleToggle(option.key)}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
