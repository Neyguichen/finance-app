export type IncomeSummaryItem = {
  montant: number | string
  montant_reel?: number | string | null
  recu?: boolean | null
  type?: 'actif' | 'passif' | string | null
  ignore_at?: string | null
}

export function summarizeIncome(items: IncomeSummaryItem[]) {
  const activeItems = items.filter(item => !item.ignore_at)
  const plannedIncome = activeItems.reduce((sum, item) => sum + Number(item.montant), 0)
  const receivedIncome = activeItems
    .filter(item => item.recu)
    .reduce((sum, item) => sum + Number(item.montant_reel ?? item.montant), 0)
  const expectedIncome = Math.max(0, plannedIncome - receivedIncome)
  const plannedActiveIncome = activeItems
    .filter(item => item.type === 'actif')
    .reduce((sum, item) => sum + Number(item.montant), 0)
  const plannedPassiveIncome = activeItems
    .filter(item => item.type === 'passif')
    .reduce((sum, item) => sum + Number(item.montant), 0)

  return {
    plannedIncome,
    receivedIncome,
    expectedIncome,
    plannedActiveIncome,
    plannedPassiveIncome,
  }
}
