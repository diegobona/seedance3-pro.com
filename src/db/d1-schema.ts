import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// D1 stores absolute instants as integer milliseconds; Drizzle exposes Date objects.
const nowMilliseconds = sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' })

export const user = sqliteTable('user', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
  updatedAt: timestamp('updated_at').default(nowMilliseconds).notNull(),
  role: text('role').default('user').notNull(),
  plan: text('plan').default('free').notNull(),
  generationCount: integer('generation_count').default(0).notNull(),
  monthlyGenerationCount: integer('monthly_generation_count').default(0).notNull(),
  generationLimit: integer('generation_limit').default(0).notNull(),
  creditBalance: integer('credit_balance').default(15).notNull(),
  dailyFreeCredits: integer('daily_free_credits').default(0).notNull(),
  dailyCreditDate: text('daily_credit_date'),
  trialCreditsGrantedAt: timestamp('trial_credits_granted_at').default(nowMilliseconds).notNull(),
  paymentCustomerId: text('payment_customer_id'),
  subscriptionStatus: text('subscription_status').default('inactive').notNull(),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
}, (table) => [
  check('user_daily_free_credits_check', sql`${table.dailyFreeCredits} >= 0 AND ${table.dailyFreeCredits} <= ${table.creditBalance}`),
])

export const generationCreditReservation = sqliteTable('generation_credit_reservation', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  credits: integer('credits').notNull(),
  dailyFreeCredits: integer('daily_free_credits').default(0).notNull(),
  dailyCreditDate: text('daily_credit_date'),
  status: text('status').default('reserved').notNull(),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
  updatedAt: timestamp('updated_at').default(nowMilliseconds).notNull(),
}, (table) => [
  index('generation_credit_reservation_user_idx').on(table.userId),
  index('generation_credit_reservation_status_idx').on(table.status),
  check('reservation_daily_free_credits_check', sql`${table.dailyFreeCredits} >= 0 AND ${table.dailyFreeCredits} <= ${table.credits}`),
])

export const videoGenerationTask = sqliteTable('video_generation_task', {
  id: text('id').primaryKey().notNull(),
  providerTaskId: text('provider_task_id'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  reservationId: text('reservation_id').notNull().references(() => generationCreditReservation.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').notNull(),
  duration: integer('duration').notNull(),
  resolution: text('resolution').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  status: text('status').default('submitting').notNull(),
  resultUrl: text('result_url'),
  providerError: text('provider_error'),
  pollAttempts: integer('poll_attempts').default(0).notNull(),
  nextPollAt: timestamp('next_poll_at'),
  leaseUntil: timestamp('lease_until'),
  lastPolledAt: timestamp('last_polled_at'),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
  updatedAt: timestamp('updated_at').default(nowMilliseconds).notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  uniqueIndex('video_generation_task_provider_task_idx').on(table.providerTaskId),
  uniqueIndex('video_generation_task_reservation_idx').on(table.reservationId),
  index('video_generation_task_user_status_idx').on(table.userId, table.status),
  index('video_generation_task_poll_due_idx').on(table.status, table.nextPollAt),
  check('video_generation_task_status_check', sql`${table.status} IN ('submitting', 'submission_unknown', 'queued', 'running', 'succeeded', 'failed', 'expired')`),
  check('video_generation_task_duration_check', sql`${table.duration} > 0`),
  check('video_generation_task_poll_attempts_check', sql`${table.pollAttempts} >= 0`),
])

export const launchWaitlist = sqliteTable('launch_waitlist', {
  userId: text('user_id').primaryKey().notNull().references(() => user.id, { onDelete: 'cascade' }),
  bonusCredits: integer('bonus_credits').default(5).notNull(),
  joinedAt: timestamp('joined_at').default(nowMilliseconds).notNull(),
  notifiedAt: timestamp('notified_at'),
  bonusGrantedAt: timestamp('bonus_granted_at'),
}, (table) => [
  check('launch_waitlist_bonus_credits_check', sql`${table.bonusCredits} > 0`),
])

export const referralVisit = sqliteTable('referral_visit', {
  visitId: text('visit_id').primaryKey().notNull(),
  visitorId: text('visitor_id').notNull(),
  source: text('source').default('anyposes').notNull(),
  entryPath: text('entry_path').notNull(),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
}, (table) => [
  index('referral_visit_source_created_at_idx').on(table.source, table.createdAt),
  index('referral_visit_visitor_idx').on(table.visitorId),
])

export const session = sqliteTable('session', {
  id: text('id').primaryKey().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
  updatedAt: timestamp('updated_at').default(nowMilliseconds).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [uniqueIndex('session_token_idx').on(table.token)])

export const account = sqliteTable('account', {
  id: text('id').primaryKey().notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
  updatedAt: timestamp('updated_at').default(nowMilliseconds).notNull(),
}, (table) => [uniqueIndex('account_provider_idx').on(table.providerId, table.accountId)])

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').default(nowMilliseconds),
  updatedAt: timestamp('updated_at').default(nowMilliseconds),
}, (table) => [uniqueIndex('verification_identifier_idx').on(table.identifier)])

export const guestVideoTrial = sqliteTable('guest_video_trial', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  networkHash: text('network_hash').notNull(),
  createdAt: timestamp('created_at').default(nowMilliseconds).notNull(),
}, (table) => [
  uniqueIndex('guest_video_trial_user_idx').on(table.userId),
  uniqueIndex('guest_video_trial_network_idx').on(table.networkHash),
])

export const authSchema = { user, session, account, verification }
