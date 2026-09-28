/**
 * Financial semantics shared by the V2 UI and calculations.
 *
 * Important: this module is deliberately pure. It does not create months,
 * recurring rows or mutate Supabase while a user navigates through periods.
 */
export type FinancialFlowKind =
  | 'earned_income'
  | 'expense'
  | 'expense_reimbursement'
  | 'savings_deposit'
  | 'savings_withdrawal'
  | 'savings_transfer'

export interface FinancialFlow {
  kind: FinancialFlowKind
  amount: number
}

export interface CashSummary {
  earnedIncome: number
  cashInflows: number
  expenses: number
  savingsDeposits: number
  savingsWithdrawals: number
  internalSavingsTransfers: number
  netCashMovement: number
}

const positive = (amount: number) => Math.abs(Number(amount) || 0)

/**
 * A savings withdrawal is a cash inflow, but never earned income.
 * A transfer between savings envelopes is neutral for the Budget.
 */
export function summarizeCashFlows(flows: FinancialFlow[]): CashSummary {
  return flows.reduce<CashSummary>(
    (summary, flow) => {
      const amount = positive(flow.amount)

      switch (flow.kind) {
        case 'earned_income':
          summary.earnedIncome += amount
          summary.cashInflows += amount
          summary.netCashMovement += amount
          break
        case 'expense':
          summary.expenses += amount
          summary.netCashMovement -= amount
          break
        case 'expense_reimbursement':
          summary.cashInflows += amount
          summary.netCashMovement += amount
          break
        case 'savings_deposit':
          summary.savingsDeposits += amount
          summary.netCashMovement -= amount
          break
        case 'savings_withdrawal':
          summary.savingsWithdrawals += amount
          summary.cashInflows += amount
          summary.netCashMovement += amount
          break
        case 'savings_transfer':
          summary.internalSavingsTransfers += amount
          break
      }

      return summary
    },
    {
      earnedIncome: 0,
      cashInflows: 0,
      expenses: 0,
      savingsDeposits: 0,
      savingsWithdrawals: 0,
      internalSavingsTransfers: 0,
      netCashMovement: 0,
    }
  )
}

export function balanceFromReference(referenceBalance: number, flows: FinancialFlow[]) {
  return Number(referenceBalance || 0) + summarizeCashFlows(flows).netCashMovement
}


export interface DatedFinancialFlow extends FinancialFlow {
  date: string
}

/**
 * Calculates the verified cash balance at a target date.
 * Only actual flows strictly after the reference date and up to the target
 * date are applied. Planned flows must never be passed to this function.
 */
export function balanceAtDate(
  referenceBalance: number,
  referenceDate: string,
  targetDate: string,
  flows: DatedFinancialFlow[]
) {
  if (targetDate === referenceDate) return Number(referenceBalance || 0)

  if (targetDate < referenceDate) {
    throw new Error('Cannot derive a historical balance before the V2 reference date')
  }

  const applicableFlows = flows.filter(
    flow => flow.date > referenceDate && flow.date <= targetDate
  )

  return balanceFromReference(referenceBalance, applicableFlows)
}
