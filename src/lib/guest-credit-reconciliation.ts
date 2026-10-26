import type { AppDatabase } from '../db/index'
import { isD1Database } from '../db/index'
import { createGuestImageTrialStore } from '../db/guest-image-trials'
import { createGuestVideoTrialStore } from '../db/guest-video-trials'
import { prepareD1CreditRefresh, D1_CREDIT_DAY_SQL, D1_NOW_SQL } from '../db/d1-generation-credits'
import { readGuestImageIdentity, guestImageNetworkHash } from './guest-image-trial'
import { readGuestVideoIdentity, guestVideoNetworkHash } from './guest-video-trial'
import { guestDeviceHash } from './guest-device'

/** Link authenticated guest cookies and the trusted network before returning account balance or generating. */
export async function reconcileGuestCredits(request: Request, userId: string, secret: string, database: AppDatabase) {
  if (!isD1Database(database)) throw new Error('Guest reconciliation requires the D1 database backend.')
  const db = database
  const [image,video,imageHash,videoHash,deviceHash] = await Promise.all([
    readGuestImageIdentity(request,{secret,store:createGuestImageTrialStore(db)}),
    readGuestVideoIdentity(request,{secret,store:createGuestVideoTrialStore(db)}),
    guestImageNetworkHash(request,secret), guestVideoNetworkHash(request,secret),
    guestDeviceHash(request,secret),
  ])
  // Network markers and any existing identities are linked atomically. Cookie deletion
  // cannot create a second anonymous allowance after this authenticated request.
  const candidates = [image?.userId ?? '',video?.userId ?? '']
  await db.batch([
    // A device hint can prevent another trial, but never identifies resource owners.
    ...(deviceHash ? ['image','video'].map(kind => db.prepare(
      `INSERT OR IGNORE INTO guest_device_claim(kind,device_hash,user_id)
       SELECT ?,?,id FROM "user" WHERE id=? AND plan<>'guest'`).bind(kind,deviceHash,userId)) : []),
    ...[imageHash,videoHash,image?.networkHash,video?.networkHash].filter((x): x is string=>Boolean(x)).map(hash =>
      db.prepare(`INSERT OR IGNORE INTO guest_network_claim(network_hash,user_id)
        SELECT ?,id FROM "user" WHERE id=? AND plan<>'guest'`).bind(hash,userId)),
    db.prepare(`INSERT OR IGNORE INTO guest_network_claim(network_hash,user_id)
      SELECT free_budget_key,? FROM "user" WHERE id IN (?,?) AND free_budget_key IS NOT NULL
      AND EXISTS(SELECT 1 FROM "user" WHERE id=? AND plan<>'guest')`).bind(userId,...candidates,userId),
    prepareD1CreditRefresh(db,userId),
    db.prepare(`INSERT OR IGNORE INTO guest_credit_claim(guest_user_id,user_id)
      SELECT guest.id,account.id FROM "user" AS guest JOIN "user" AS account ON account.id=? AND account.plan<>'guest'
      WHERE guest.plan='guest' AND (guest.free_budget_key IN
        (SELECT free_budget_key FROM "user" WHERE id IN (?,?)) OR guest.id IN (?,?)
        OR guest.id IN (SELECT user_id FROM guest_image_trial WHERE network_hash=?)
        OR guest.id IN (SELECT user_id FROM guest_video_trial WHERE network_hash=?))`).bind(userId,...candidates,...candidates,imageHash,videoHash),
    db.prepare(`INSERT INTO generation_credit_reservation
      (id,user_id,credits,daily_free_credits,daily_credit_date,status,created_at,updated_at,free_cost_micros,guest_source_id)
      SELECT 'guest-link-'||source_id,?,debit,debit,${D1_CREDIT_DAY_SQL},'reserved',${D1_NOW_SQL},${D1_NOW_SQL},0,source_id
      FROM (SELECT id AS source_id,min(credits,max(0,(SELECT daily_free_credits FROM "user" WHERE id=?)
        -coalesce(sum(credits) OVER (ORDER BY created_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0))) AS debit
        FROM generation_credit_reservation AS original WHERE daily_credit_date=${D1_CREDIT_DAY_SQL}
          AND status IN ('reserved','settled') AND guest_source_id IS NULL
          AND user_id IN (SELECT guest_user_id FROM guest_credit_claim WHERE user_id=?)
          AND NOT EXISTS(SELECT 1 FROM generation_credit_reservation AS linked WHERE linked.guest_source_id=original.id))
      WHERE debit>0`).bind(userId,userId,userId),
    db.prepare(`UPDATE generation_credit_reservation SET status='settled'
      WHERE status='reserved' AND user_id=? AND guest_source_id IN
        (SELECT id FROM generation_credit_reservation WHERE status='settled')`).bind(userId),
    db.prepare(`UPDATE "user" SET credit_balance=0,daily_free_credits=0
      WHERE id IN (SELECT guest_user_id FROM guest_credit_claim WHERE user_id=?)`).bind(userId),
  ])
}
