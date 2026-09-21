import { eq } from 'drizzle-orm'
import type { Database } from '.'
import { launchWaitlist } from './schema'
import { LAUNCH_BONUS_CREDITS, type LaunchWaitlistStatus } from '../lib/launch-waitlist-response'

function normalizeBonusCredits(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : LAUNCH_BONUS_CREDITS
}

export function createLaunchWaitlistStore(db: Database) {
  async function getStatus(userId: string): Promise<LaunchWaitlistStatus> {
    const rows = await db.select({
      bonusCredits: launchWaitlist.bonusCredits,
    }).from(launchWaitlist).where(eq(launchWaitlist.userId, userId)).limit(1)
    return rows[0]
      ? { joined: true, bonusCredits: normalizeBonusCredits(rows[0].bonusCredits) }
      : { joined: false, bonusCredits: LAUNCH_BONUS_CREDITS }
  }

  return {
    getStatus,
    async join(userId: string) {
      await db.insert(launchWaitlist).values({
        userId,
        bonusCredits: LAUNCH_BONUS_CREDITS,
      }).onConflictDoNothing()
      return getStatus(userId)
    },
  }
}
