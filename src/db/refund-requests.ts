export type RefundReviewStatus = 'pending' | 'approved' | 'rejected'
export type PaymentRefundStatus = 'none' | 'pending' | 'requires_action' | 'succeeded' | 'partial' | 'failed' | 'canceled'
export type RefundRequestView = {
  id:string; status:RefundReviewStatus; reason:string; note:string; version:number
  createdAt:string; updatedAt:string; paymentStatus:PaymentRefundStatus; refundedAmount:number; pendingAmount:number
}
export type RefundAdminView = RefundRequestView & {
  orderId:string; userId:string; email:string; amount:number; currency:string; orderCreatedAt:string
  paymentIntentId:string|null; liveMode:boolean; notificationSentAt:string|null; notificationAttempts:number
}
type Row = {
  id:string; order_id:string; user_id:string; email:string; reason:string; locale:string
  status:RefundReviewStatus; note:string; version:number; created_at:number; updated_at:number
  amount:number; currency:string; order_created_at:number; payment_intent_id:string|null; live_mode:number
  notification_sent_at:number|null; notification_attempts:number; notification_claim:string|null
  refunded_amount:number; pending_amount:number; needs_action:number; failed_count:number; canceled_count:number
}
const select = `SELECT r.*,o.amount,o.currency,o.created_at AS order_created_at,o.payment_intent_id,o.live_mode,
  COALESCE((SELECT SUM(amount) FROM stripe_payment_refund WHERE order_id=r.order_id AND status='succeeded'),0) AS refunded_amount,
  COALESCE((SELECT SUM(amount) FROM stripe_payment_refund WHERE order_id=r.order_id AND status IN ('pending','requires_action')),0) AS pending_amount,
  (SELECT COUNT(*) FROM stripe_payment_refund WHERE order_id=r.order_id AND status='requires_action') AS needs_action,
  (SELECT COUNT(*) FROM stripe_payment_refund WHERE order_id=r.order_id AND status='failed') AS failed_count,
  (SELECT COUNT(*) FROM stripe_payment_refund WHERE order_id=r.order_id AND status='canceled') AS canceled_count
  FROM refund_request r JOIN stripe_order o ON o.id=r.order_id`
const iso=(time:number)=>new Date(time).toISOString()
function view(row:Row):RefundRequestView {
  const paymentStatus:PaymentRefundStatus=row.refunded_amount>=row.amount?'succeeded':row.needs_action?'requires_action':row.pending_amount?'pending':row.refunded_amount?'partial':row.failed_count?'failed':row.canceled_count?'canceled':'none'
  return {id:row.id,status:row.status,reason:row.reason,note:row.note,version:row.version,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),paymentStatus,refundedAmount:row.refunded_amount,pendingAmount:row.pending_amount}
}
function adminView(row:Row):RefundAdminView {
  return {...view(row),orderId:row.order_id,userId:row.user_id,email:row.email,amount:row.amount,currency:row.currency,orderCreatedAt:iso(row.order_created_at),paymentIntentId:row.payment_intent_id,liveMode:row.live_mode===1,notificationSentAt:row.notification_sent_at?iso(row.notification_sent_at):null,notificationAttempts:row.notification_attempts}
}
export function createRefundRequestStore(db:D1Database) {
  return {
    async orderForOwner(id:string,userId:string) {
      return db.prepare('SELECT id,status FROM stripe_order WHERE id=? AND user_id=?').bind(id,userId).first<{id:string;status:string}>()
    },
    async submit(userId:string,orderId:string,reason:string,locale:string) {
      await db.prepare(`INSERT OR IGNORE INTO refund_request(id,order_id,user_id,email,reason,locale)
        SELECT ?,o.id,o.user_id,u.email,?,? FROM stripe_order o JOIN user u ON u.id=o.user_id
        WHERE o.id=? AND o.user_id=? AND o.status='paid'`).bind(crypto.randomUUID(),reason,locale,orderId,userId).run()
      return this.forOrder(orderId,userId)
    },
    async forOrder(orderId:string,userId:string) {
      const row=await db.prepare(select+' WHERE r.order_id=? AND r.user_id=?').bind(orderId,userId).first<Row>()
      return row?view(row):null
    },
    async forOrders(userId:string,orderIds:string[]) {
      if(!orderIds.length)return new Map<string,RefundRequestView>()
      const result=await db.prepare(select+` WHERE r.user_id=? AND r.order_id IN (${orderIds.map(()=>'?').join(',')})`).bind(userId,...orderIds).all<Row>()
      return new Map(result.results.map(row=>[row.order_id,view(row)]))
    },
    async adminPage(cursor:string|null) {
      const before=cursor?/^(\d{1,16})_([A-Za-z0-9_-]{1,128})$/.exec(cursor):null
      if(cursor&&(!before||!Number.isSafeInteger(Number(before[1]))))throw new TypeError('Invalid cursor')
      const result=await db.prepare(select+(before?' WHERE (r.created_at<? OR (r.created_at=? AND r.id<?))':'')+' ORDER BY r.created_at DESC,r.id DESC LIMIT 51')
        .bind(...(before?[Number(before[1]),Number(before[1]),before[2]]:[])).all<Row>()
      const rows=result.results.slice(0,50),last=rows.at(-1)
      return {requests:rows.map(adminView),nextCursor:result.results.length>50&&last?`${last.created_at}_${last.id}`:null}
    },
    async adminRequest(id:string) {
      const row=await db.prepare(select+' WHERE r.id=?').bind(id).first<Row>()
      return row?adminView(row):null
    },
    async review(id:string,actor:string,status:'approved'|'rejected',note:string,version:number) {
      const result=await db.prepare(`UPDATE refund_request SET status=?,note=?,reviewed_by=?,version=version+1,updated_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
        WHERE id=? AND status='pending' AND version=?`).bind(status,note,actor,id,version).run()
      return result.meta.changes===1?this.adminRequest(id):null
    },
    async claimNotification(now:number) {
      const claim=crypto.randomUUID()
      const updated=await db.prepare(`UPDATE refund_request SET notification_claim=?,notification_next_at=?,notification_attempts=notification_attempts+1
        WHERE id=(SELECT id FROM refund_request WHERE notification_sent_at IS NULL AND notification_next_at<=? ORDER BY created_at,id LIMIT 1)
        AND notification_sent_at IS NULL AND notification_next_at<=? RETURNING id`).bind(claim,now+120000,now,now).first<{id:string}>()
      if(!updated)return null
      return {request:(await this.adminRequest(updated.id))!,claim}
    },
    async finishNotification(id:string,claim:string,now:number,sent:boolean,attempts:number) {
      await db.prepare(`UPDATE refund_request SET notification_sent_at=?,notification_next_at=?,notification_claim=NULL
        WHERE id=? AND notification_claim=?`).bind(sent?now:null,sent?now:now+Math.min(3600000,60000*2**Math.min(attempts,6)),id,claim).run()
    },
    async hasPaymentRequest(intent:string) {
      return Boolean(await db.prepare('SELECT r.id FROM refund_request r JOIN stripe_order o ON o.id=r.order_id WHERE o.payment_intent_id=?').bind(intent).first())
    },
    async syncPaymentRefunds(intent:string,refunds:{id:string;amount:number;currency:string;status:string}[]) {
      if(!refunds.length)return
      await db.batch(refunds.map(refund=>db.prepare(`INSERT INTO stripe_payment_refund(id,order_id,amount,currency,status)
        SELECT ?,id,?,?,? FROM stripe_order WHERE payment_intent_id=? AND currency=? AND amount>=?
        ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,currency=excluded.currency,status=excluded.status,updated_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
        WHERE stripe_payment_refund.order_id=excluded.order_id`).bind(refund.id,refund.amount,refund.currency,refund.status,intent,refund.currency,refund.amount)))
    },
  }
}
export type RefundRequestStore=ReturnType<typeof createRefundRequestStore>
