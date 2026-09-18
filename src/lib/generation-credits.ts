export const TRIAL_CREDIT_GRANT = 15
export const GPT_IMAGE_2_CREDIT_COST = 5

export interface CreditReservation {
  id: string
  remainingCredits: number
}

export interface GenerationCreditStore {
  reserve(userId: string, credits: number): Promise<CreditReservation | null>
  settle(reservationId: string): Promise<void>
  refund(reservationId: string): Promise<{ remainingCredits: number }>
  getBalance(userId: string): Promise<number>
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
