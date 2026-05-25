'use client'

type StatKey =
  | 'repartition' | 'ratioCharges' | 'maitrise' | 'epargne20'
  | 'top3Depenses' | 'top3Categories'
  | 'bilanEpargne' | 'bilanMoisExtremes' | 'bilanGraphRevSortants'
  | 'bilanGraphReste' | 'bilanCatVariable' | 'bilanTableau'

type StatOption = { key: StatKey; label: string; icon: string; desc: string }

const DASHBOARD_OPTIONS: StatOption[] = [
  { key: 'repartition', label: 'Répartition catégories', icon: '🍩', desc: 'Graphique en donut + tableau détaillé de vos dépenses par catégorie avec comparaison M-1.' },
  { key: 'ratioCharges', label: 'Fixes / Revenus', icon: '💶', desc: 'Pourcentage de vos charges fixes par rapport aux revenus actifs. Idéalement < 50%.' },
  { key: 'maitrise', label: 'Maîtrise budget', icon: '🎯', desc: 'Comparaison dépenses réelles vs budget prévu. En dessous de 100% = vous êtes dans les clous.' },
  { key: 'epargne20', label: 'Épargne (règle 20%)', icon: '💰', desc: 'Objectif d&apos;épargne basé sur la règle des 20% : (Revenus − Charges fixes) × 20%.' },
  { key: 'top3Depenses', label: 'Top 3 dépenses', icon: '🏆', desc: 'Les 3 plus grosses dépenses individuelles du mois.' },
  { key: 'top3Categories', label: 'Top 3 catégories', icon: '📊', desc: 'Les 3 catégories où vous avez le plus dépensé ce mois.' },
]

const BILAN_OPTIONS: StatOption[] = [
  { key: 'bilanEpargne', label: 'Épargne nette + taux', icon: '💰', desc: 'Total épargné sur l&apos;année et pourcentage d&apos;épargne par rapport aux revenus.' },
  { key: 'bilanMoisExtremes', label: 'Mois + dépensier / économe', icon: '📈', desc: 'Identifie les mois où vous avez le plus et le moins dépensé.' },
  { key: 'bilanGraphRevSortants', label: 'Revenus vs Sortants', icon: '📉', desc: 'Courbe d&apos;évolution mensuelle comparant revenus et dépenses totales.' },
  { key: 'bilanGraphReste', label: 'Reste à vivre mensuel', icon: '💵', desc: 'Courbe du solde disponible en fin de chaque mois sur l&apos;année.' },
  { key: 'bilanCatVariable', label: 'Catégorie la plus variable', icon: '🔀', desc: 'La catégorie avec le plus grand écart entre son mois min et son mois max.' },
  { key: 'bilanTableau', label: 'Tableau des catégories', icon: '📋', desc: 'Tableau récapitulatif : total, moyenne, min et max par catégorie sur l&apos;année.' },
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
            <div key={opt.key} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span className="text-sm text-slate-300">{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-7">{opt.desc}</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary flex-shrink-0"
                checked={stats[opt.key]}
                onChange={() => handleToggle(opt.key)}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Bilan annuel</p>
        <div className="space-y-1.5">
          {BILAN_OPTIONS.map(opt => (
            <div key={opt.key} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span className="text-sm text-slate-300">{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-7">{opt.desc}</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary flex-shrink-0"
                checked={stats[opt.key]}
                onChange={() => handleToggle(opt.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}