import { creditPack, DEFAULT_CREDIT_PACK_ID } from '../../assets/credit-packs.mjs'
import { prepareD1CreditRefresh } from './d1-generation-credits'

export type StripeOrder = {
  amount: number; credits: number; currency: string; id: string; user_id: string; price_id: string; live_mode: number; session_id: string | null
  payment_intent_id: string | null; status: 'pending' | 'paid' | 'reversed'
}
export type StripeHistoryOrder = {
  id: string; sessionId: string | null; createdAt: string; status: StripeOrder['status']
  amount: number; currency: string; credits: number; revokedCredits: number
}
export function createStripePaymentStore(db: D1Database) {
  return {
    async createOrder(id: string, userId: string, priceId: string, live: boolean, packId = DEFAULT_CREDIT_PACK_ID) {
      const pack = creditPack(packId)
      if (!pack) throw new TypeError('Invalid credit pack')
      await db.batch([
        prepareD1CreditRefresh(db, userId),
        db.prepare(`INSERT INTO stripe_order (id,user_id,price_id,live_mode,amount,credits)
          SELECT ?,id,?,?,?,? FROM "user" WHERE id=? AND billing_hold=0 AND plan!='guest'
          AND id NOT LIKE 'guest:%' AND id NOT LIKE 'guest-%'`)
          .bind(id, priceId, Number(live), pack.amount, pack.credits, userId),
      ])
      if (!await this.order(id)) throw new Error('Account unavailable for checkout.')
    },
    async attachSession(id: string, sessionId: string, priceId?: string) {
      await db.prepare('UPDATE stripe_order SET session_id=?,price_id=COALESCE(?,price_id) WHERE id=? AND (session_id IS NULL OR session_id=?)')
        .bind(sessionId, priceId ?? null, id, sessionId).run()
    },
    order(id: string) { return db.prepare('SELECT * FROM stripe_order WHERE id=?').bind(id).first<StripeOrder>() },
    paymentOrder(intent: string) { return db.prepare('SELECT * FROM stripe_order WHERE payment_intent_id=?').bind(intent).first<StripeOrder>() },
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
        db.prepare(`INSERT INTO stripe_reversal (payment_intent_id,reason)
          SELECT ?,? WHERE EXISTS(SELECT 1 FROM stripe_event WHERE id=? AND object_id=? AND kind='reversal')
          ON CONFLICT(payment_intent_id) DO UPDATE SET reason=excluded.reason
          WHERE excluded.reason NOT IN ('charge.refunded','refund.created','refund.updated','payment-refunded')`)
          .bind(paymentIntentId, reason, eventId, paymentIntentId),
      ])
    },
    async historyPage(userId: string, cursor?: string | null): Promise<{ orders: StripeHistoryOrder[]; nextCursor: string | null }> {
      let before: { time: number; id: string } | null = null
      if (cursor) {
        const match = /^(\d{1,16})_([A-Za-z0-9_-]{1,128})$/.exec(cursor)
        if (!match || !Number.isSafeInteger(Number(match[1]))) throw new TypeError('Invalid order cursor')
        before = { time: Number(match[1]), id: match[2] }
      }
      const result = await db.prepare(`SELECT id,session_id,created_at,status,amount,currency,credits,revoked_credits
        FROM stripe_order WHERE user_id=? ${before ? 'AND (created_at<? OR (created_at=? AND id<?))' : ''}
        ORDER BY created_at DESC,id DESC LIMIT 51`).bind(userId,...(before ? [before.time,before.time,before.id] : [])).all<{
          id: string; session_id: string | null; created_at: number; status: StripeOrder['status']
          amount: number; currency: string; credits: number; revoked_credits: number
        }>()
      const rows = result.results.slice(0,50)
      const last = rows.at(-1)
      return { orders: rows.map(row => ({
        id: row.id, sessionId: row.session_id, createdAt: new Date(row.created_at).toISOString(),
        status: row.status, amount: row.amount, currency: row.currency, credits: row.credits, revokedCredits: row.revoked_credits,
      })), nextCursor: result.results.length > 50 && last ? `${last.created_at}_${last.id}` : null }
    },
    async history(userId: string): Promise<StripeHistoryOrder[]> {
      return (await this.historyPage(userId)).orders
    },
  }
}
export type StripePaymentStore = ReturnType<typeof createStripePaymentStore>
