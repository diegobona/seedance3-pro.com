import { isD1Database, type AppDatabase } from './index'
import { guestDeviceStore, prepareGuestDeviceClaim } from './guest-device-claims'
import { getD1CurrentCreditBalance } from './d1-generation-credits'
import { GUEST_VIDEO_SECONDS, type GuestVideoIdentity, type GuestVideoTrialStore } from '../lib/guest-video-trial'
import { GUEST_VIDEO_DURATION_SECONDS } from '../../app/guest-video.mjs'

export function createGuestVideoTrialStore(database: AppDatabase): GuestVideoTrialStore {
  if (!isD1Database(database)) throw new Error('Guest video trials require the D1 database backend.')
  const db = database
  return {
    ...guestDeviceStore(db, 'video'),
    async syncBudget(hashes,budgetKey) {
      await db.prepare(`UPDATE "user" SET free_budget_key=? WHERE plan='guest' AND id IN
        (SELECT user_id FROM guest_image_trial WHERE network_hash IN (?,?)
         UNION SELECT user_id FROM guest_video_trial WHERE network_hash IN (?,?))`)
        .bind(budgetKey,...hashes,...hashes).run()
    },
    getById(id) {
      return db.prepare('SELECT trial.id,trial.user_id AS userId,trial.network_hash AS networkHash, claim.user_id AS claimedUserId FROM guest_video_trial AS trial LEFT JOIN guest_credit_claim AS claim ON claim.guest_user_id=trial.user_id WHERE trial.id=?')
        .bind(id).first<GuestVideoIdentity>()
    },
    async hasNetwork(networkHash) {
      return Boolean(await db.prepare('SELECT id FROM guest_video_trial WHERE network_hash=? UNION ALL SELECT user_id AS id FROM guest_network_claim WHERE network_hash=?').bind(networkHash,networkHash).first())
    },
    async bindNetwork(networkHash, userId) {
      // Preserve existing wallets on shared networks. This marker only prevents
      // new claims; the existing database trigger also protects stale pre-checks.
      // Exhausted or reconciled cookies must not occupy more networks.
      await db.prepare(`INSERT OR IGNORE INTO guest_network_claim(network_hash,user_id)
        SELECT ?,account.id FROM "user" AS account
        JOIN guest_video_trial AS trial ON trial.user_id=account.id
        WHERE account.id=? AND account.plan='guest' AND account.credit_balance>=?
          AND NOT EXISTS(SELECT 1 FROM guest_credit_claim WHERE guest_user_id=account.id)`)
        .bind(networkHash, userId, GUEST_VIDEO_DURATION_SECONDS).run()
    },
    async create(identity) {
      // D1 batches roll back both inserts on a simultaneous unique-network claim.
      await db.batch([
        db.prepare('INSERT INTO "user" (id,name,email,plan,credit_balance,free_budget_key) VALUES (?,?,?,?,?,?)')
          .bind(identity.userId, 'Guest', `${identity.id}@guest.invalid`, 'guest', GUEST_VIDEO_SECONDS, identity.budgetKey ?? null),
        db.prepare('INSERT INTO guest_video_trial (id,user_id,network_hash) VALUES (?,?,?)')
          .bind(identity.id, identity.userId, identity.networkHash),
        ...(identity.deviceHash ? [prepareGuestDeviceClaim(db, 'video', identity.deviceHash, identity.userId)] : []),
      ])
    },
    getBalance(userId) { return getD1CurrentCreditBalance(db, userId) },
  }
}
