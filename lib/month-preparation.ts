export type RecurringTemplate = { actif: boolean; frequence_mois: number; mois_debut: string | null; created_at: string }

const monthIndex = (month: string) => {
  const [year, value] = month.slice(0, 7).split('-').map(Number)
  return year * 12 + value - 1
}

export function isHabitDue(template: RecurringTemplate, targetMonth: string) {
  if (!template.actif) return false
  const start = template.mois_debut?.slice(0, 7) || template.created_at?.slice(0, 7)
  if (!start) return false
  const distance = monthIndex(targetMonth) - monthIndex(start)
  return distance >= 0 && distance % Math.max(1, template.frequence_mois || 1) === 0
}

export type MonthPreparationItem = {
  id: string
  kind: 'income' | 'fixed' | 'savings' | 'budget'
  label: string
  amount: number
  sourceId?: string
  recurrentId?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  envelopeId?: string
  incomeType?: 'actif' | 'passif'
  order?: number
  selected: boolean
}

export type MonthPreparationPreview = {
  mode: 'previous' | 'habits'
  sourceMonth?: string
  items: MonthPreparationItem[]
}
