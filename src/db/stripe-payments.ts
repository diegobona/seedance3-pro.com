import { prepareD1CreditRefresh } from './d1-generation-credits'

export type StripeOrder = {
  id: string; user_id: string; price_id: string; live_mode: number; session_id: string | null
  payment_intent_id: string | null; status: 'pending' | 'paid' | 'reversed'
}
export type StripeHistoryOrder = {
  id: string; sessionId: string | null; createdAt: string; status: StripeOrder['status']
  amount: number; currency: string; credits: number; revokedCredits: number
}
export function createStripePaymentStore(db: D1Database) {
  return {
    async createOrder(id: string, userId: string, priceId: string, live: boolean) {
      await db.batch([
        prepareD1CreditRefresh(db, userId),
        db.prepare(`INSERT INTO stripe_order (id,user_id,price_id,live_mode)
          SELECT ?,id,?,? FROM "user" WHERE id=? AND billing_hold=0 AND plan!='guest'
          AND id NOT LIKE 'guest:%' AND id NOT LIKE 'guest-%'`)
          .bind(id, priceId, Number(live), userId),
      ])
      if (!await this.order(id)) throw new Error('Account unavailable for checkout.')
    },
    async attachSession(id: string, sessionId: string) {
      await db.prepare('UPDATE stripe_order SET session_id=? WHERE id=? AND (session_id IS NULL OR session_id=?)')
        .bind(sessionId, id, sessionId).run()
    },
    order(id: string) { return db.prepare('SELECT * FROM stripe_order WHERE id=?').bind(id).first<StripeOrder>() },
    async isHeld(userId: string) {
      const row = await db.prepare('SELECT billing_hold FROM "user" WHERE id=?').bind(userId).first<{ billing_hold: number }>()
      return !row || row.billing_hold !== 0
    },
    async fulfill(input: { eventId: string; orderId: string; sessionId: string; paymentIntentId: string }) {
      // D1 batch is transactional; the state transition and trigger credit cannot split.
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO stripe_event (id,object_id,kind) VALUES (?,?,?)')
          .bind(input.eventId, input.orderId, 'payment'),
        db.prepare(`UPDATE stripe_order SET payment_intent_id=?, session_id=?,
          status=CASE WHEN EXISTS(SELECT 1 FROM stripe_reversal WHERE payment_intent_id=?) THEN 'reversed' ELSE 'paid' END,
          updated_at=CAST(unixepoch('subsec') * 1000 AS INTEGER)
          WHERE id=? AND status='pending' AND (session_id IS NULL OR session_id=?)
            AND EXISTS(SELECT 1 FROM stripe_event WHERE id=? AND object_id=? AND kind='payment')`)
          .bind(input.paymentIntentId, input.sessionId, input.paymentIntentId, input.orderId, input.sessionId, input.eventId, input.orderId),
      ])
    },
    async reverse(eventId: string, paymentIntentId: string, reason: string) {
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO stripe_event (id,object_id,kind) VALUES (?,?,?)').bind(eventId, paymentIntentId, 'reversal'),
        db.prepare(`INSERT OR IGNORE INTO stripe_reversal (payment_intent_id,reason)
          SELECT ?,? WHERE EXISTS(SELECT 1 FROM stripe_event WHERE id=? AND object_id=? AND kind='reversal')`)
          .bind(paymentIntentId, reason, eventId, paymentIntentId),
      ])
    },
    async history(userId: string): Promise<StripeHistoryOrder[]> {
      const result = await db.prepare(`SELECT id,session_id,created_at,status,amount,currency,credits,revoked_credits
        FROM stripe_order WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50`).bind(userId).all<{
          id: string; session_id: string | null; created_at: number; status: StripeOrder['status']
          amount: number; currency: string; credits: number; revoked_credits: number
        }>()
      return result.results.map(row => ({
        id: row.id, sessionId: row.session_id, createdAt: new Date(row.created_at).toISOString(),
        status: row.status, amount: row.amount, currency: row.currency, credits: row.credits, revokedCredits: row.revoked_credits,
      }))
    },
  }
}
export type StripePaymentStore = ReturnType<typeof createStripePaymentStore>
