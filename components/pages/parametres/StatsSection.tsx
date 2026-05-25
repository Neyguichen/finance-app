'use client'

type StatKey =
  | 'repartition' | 'ratioCharges' | 'maitrise' | 'epargne20'
  | 'top3Depenses' | 'top3Categories'
  | 'bilanEpargne' | 'bilanMoisExtremes' | 'bilanGraphRevSortants'
  | 'bilanGraphReste' | 'bilanCatVariable' | 'bilanTableau'

type StatOption = { key: StatKey; label: string; icon: string }

const DASHBOARD_OPTIONS: StatOption[] = [
  { key: 'repartition', label: 'Répartition catégories', icon: '🍩' },
  { key: 'ratioCharges', label: 'Fixes / Revenus', icon: '💶' },
  { key: 'maitrise', label: 'Maîtrise budget', icon: '🎯' },
  { key: 'epargne20', label: 'Épargne (règle 20%)', icon: '💰' },
  { key: 'top3Depenses', label: 'Top 3 dépenses', icon: '🏆' },
  { key: 'top3Categories', label: 'Top 3 catégories', icon: '📊' },
]

const BILAN_OPTIONS: StatOption[] = [
  { key: 'bilanEpargne', label: 'Épargne nette + taux', icon: '💰' },
  { key: 'bilanMoisExtremes', label: 'Mois + dépensier / économe', icon: '📈' },
  { key: 'bilanGraphRevSortants', label: 'Revenus vs Sortants', icon: '📉' },
  { key: 'bilanGraphReste', label: 'Reste à vivre mensuel', icon: '💵' },
  { key: 'bilanCatVariable', label: 'Catégorie la plus variable', icon: '🔀' },
  { key: 'bilanTableau', label: 'Tableau des catégories', icon: '📋' },
]

const DEFAULT_STATS: Record<StatKey, boolean> = {
  repartition: true, ratioCharges: true, maitrise: true, epargne20: true,
  top3Depenses: true, top3Categories: true,
  bilanEpargne: true, bilanMoisExtremes: true, bilanGraphRevSortants: true,
  bilanGraphReste: true, bilanCatVariable: true, bilanTableau: true,
}

type Props = {
  dashboardStats: Record<string, boolean> | null
  onUpdate: (stats: Record<StatKey, boolean>) => Promise<void>
}

function StatToggleRow({ option, checked, onToggle }: { option: StatOption; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span>{option.icon}</span>
        <span className="text-sm text-slate-300">{option.label}</span>
      </div>
      <input
        type="checkbox"
        className="toggle toggle-sm toggle-primary"
        checked={checked}
        onChange={onToggle}
      />
    </div>
  )
}

export default function StatsSection({ dashboardStats, onUpdate }: Props) {
  const stats = { ...DEFAULT_STATS, ...dashboardStats } as Record<StatKey, boolean>

  const handleToggle = async (key: StatKey) => {
    const updated = { ...stats, [key]: !stats[key] }
    await onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Dashboard mensuel</p>
        <div className="space-y-1.5">
          {DASHBOARD_OPTIONS.map(opt => (
            <StatToggleRow key={opt.key} option={opt} checked={stats[opt.key]} onToggle={() => handleToggle(opt.key)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Bilan annuel</p>
        <div className="space-y-1.5">
          {BILAN_OPTIONS.map(opt => (
            <StatToggleRow key={opt.key} option={opt} checked={stats[opt.key]} onToggle={() => handleToggle(opt.key)} />
          ))}
        </div>
      </div>
    </div>
  )
}