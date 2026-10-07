export type IncomeSummaryItem = {
  montant: number | string
  montant_reel?: number | string | null
  recu?: boolean | null
  type?: 'actif' | 'passif' | string | null
}

export function summarizeIncome(items: IncomeSummaryItem[]) {
  const plannedIncome = items.reduce((sum, item) => sum + Number(item.montant), 0)
  const receivedIncome = items
    .filter(item => item.recu)
    .reduce((sum, item) => sum + Number(item.montant_reel ?? item.montant), 0)
  const expectedIncome = Math.max(0, plannedIncome - receivedIncome)
  const plannedActiveIncome = items
    .filter(item => item.type === 'actif')
    .reduce((sum, item) => sum + Number(item.montant), 0)
  const plannedPassiveIncome = items
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
