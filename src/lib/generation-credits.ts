export const DAILY_FREE_CREDIT_GRANT = 5
// Existing unclassified trial balances used the old 15-credit allowance.
export const LEGACY_TRIAL_CREDIT_GRANT = 15
export const DAILY_CREDIT_TIME_ZONE = 'Asia/Shanghai'
export const GPT_IMAGE_2_CREDIT_COST = 1

export interface CreditReservation {
  id: string
  remainingCredits: number
}

export interface CreditReservationOptions { unitCostMicros?: number; paidOnly?: boolean; networkKey?: string }
export interface CreditBreakdown { remaining: number; dailyRemaining: number; paidRemaining: number; freeBudgetRemainingMicros: number }
export class CreditPolicyError extends Error {
  constructor(public code: 'FREE_BUDGET_EXCEEDED' | 'NETWORK_FREE_BUDGET_EXCEEDED' | 'BILLING_HOLD' | 'CREDIT_BACKEND_UNSUPPORTED') { super(code) }
}
export interface GenerationCreditStore {
  reserve(userId: string, credits: number, options?: CreditReservationOptions): Promise<CreditReservation | null>
  settle(reservationId: string, fulfilledCredits?: number): Promise<void>
  refund(reservationId: string): Promise<{ remainingCredits: number }>
  getBalance(userId: string): Promise<number>
  getBreakdown?(userId: string): Promise<CreditBreakdown>
}

export function withCreditHeaders(response: Response, cost: number, remainingCredits: number) {
  const headers = new Headers(response.headers)
  headers.set('x-seedance-credit-cost', String(cost))
  headers.set('x-seedance-credit-remaining', String(remainingCredits))
  headers.set('cache-control', 'no-store')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
