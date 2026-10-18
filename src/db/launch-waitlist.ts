import { eq } from 'drizzle-orm'
import { isD1Database, type AppDatabase } from '.'
import { launchWaitlist } from './schema'
import { LAUNCH_BONUS_CREDITS, type LaunchWaitlistStatus } from '../lib/launch-waitlist-response'

function normalizeBonusCredits(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : LAUNCH_BONUS_CREDITS
}

export function createLaunchWaitlistStore(db: AppDatabase) {
  if (isD1Database(db)) {
    const getStatus = async (userId: string): Promise<LaunchWaitlistStatus> => {
      const row = await db.prepare('SELECT bonus_credits FROM launch_waitlist WHERE user_id=?').bind(userId).first<{ bonus_credits: number }>()
      return row ? { joined: true, bonusCredits: normalizeBonusCredits(row.bonus_credits) } : { joined: false, bonusCredits: LAUNCH_BONUS_CREDITS }
    }
    return {
      getStatus,
      async join(userId: string) {
        await db.prepare('INSERT INTO launch_waitlist (user_id,bonus_credits) VALUES (?,?) ON CONFLICT DO NOTHING').bind(userId, LAUNCH_BONUS_CREDITS).run()
        return getStatus(userId)
      },
    }
  }
  const postgres = db
  async function getStatus(userId: string): Promise<LaunchWaitlistStatus> {
    const rows = await postgres.select({
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
