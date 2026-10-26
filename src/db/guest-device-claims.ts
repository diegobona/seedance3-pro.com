type Kind = 'image' | 'video'

export function prepareGuestDeviceClaim(db: D1Database, kind: Kind, deviceHash: string, userId: string) {
  return db.prepare('INSERT INTO guest_device_claim (kind,device_hash,user_id) VALUES (?,?,?)')
    .bind(kind, deviceHash, userId)
}

export function guestDeviceStore(db: D1Database, kind: Kind) {
  return {
    async hasDevice(hash: string) {
      return Boolean(await db.prepare('SELECT 1 FROM guest_device_claim WHERE kind=? AND device_hash=?')
        .bind(kind, hash).first())
    },
    async bindDevice(hash: string, userId: string) {
      // Signed cookies retain their allowance even if a device signal collides.
      // Never replace another visitor's claim or grant access using the hash.
      await db.prepare('INSERT OR IGNORE INTO guest_device_claim (kind,device_hash,user_id) VALUES (?,?,?)')
        .bind(kind, hash, userId).run()
    },
  }
}
