export const cents = (value: number | string | null | undefined) =>
  Math.round(Number(value || 0) * 100) / 100

export function normalizeFinancialLabel(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function labelsClose(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeFinancialLabel(a)
  const right = normalizeFinancialLabel(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

export function sameAmount(a: number | string | null | undefined, b: number | string | null | undefined, tolerance = 0.01) {
  return Math.abs(cents(a) - cents(b)) < tolerance
}

export function sameDateAmountLabel(args: {
  sourceDate: string
  sourceAmount: number
  sourceLabel: string
  targetDate?: string | null
  targetAmount?: number | string | null
  targetLabel?: string | null
}) {
  return Boolean(
    args.targetDate === args.sourceDate &&
    sameAmount(args.targetAmount, Math.abs(args.sourceAmount)) &&
    labelsClose(args.targetLabel, args.sourceLabel)
  )
}

export function exactPairIndexes(effects: number[], target: number) {
  const roundedTarget = cents(target)
  for (let i = 0; i < effects.length; i += 1) {
    for (let j = i + 1; j < effects.length; j += 1) {
      if (Math.abs(cents(effects[i] + effects[j]) - roundedTarget) < 0.01) {
        return [i, j] as const
      }
    }
  }
  return null
}
