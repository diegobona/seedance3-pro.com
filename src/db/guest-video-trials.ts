import { isD1Database, type AppDatabase } from './index'
import { getD1CurrentCreditBalance } from './d1-generation-credits'
import { GUEST_VIDEO_SECONDS, type GuestVideoIdentity, type GuestVideoTrialStore } from '../lib/guest-video-trial'

export function createGuestVideoTrialStore(database: AppDatabase): GuestVideoTrialStore {
  if (!isD1Database(database)) throw new Error('Guest video trials require the D1 database backend.')
  const db = database
  return {
    getById(id) {
      return db.prepare('SELECT id,user_id AS userId,network_hash AS networkHash FROM guest_video_trial WHERE id=?')
        .bind(id).first<GuestVideoIdentity>()
    },
    async hasNetwork(networkHash) {
      return Boolean(await db.prepare('SELECT id FROM guest_video_trial WHERE network_hash=?').bind(networkHash).first())
    },
    async create(identity) {
      // D1 batches roll back both inserts on a simultaneous unique-network claim.
      await db.batch([
        db.prepare('INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES (?,?,?,?,?)')
          .bind(identity.userId, 'Guest', `${identity.id}@guest.invalid`, 'guest', GUEST_VIDEO_SECONDS),
        db.prepare('INSERT INTO guest_video_trial (id,user_id,network_hash) VALUES (?,?,?)')
          .bind(identity.id, identity.userId, identity.networkHash),
      ])
    },
    getBalance(userId) { return getD1CurrentCreditBalance(db, userId) },
  }
}
