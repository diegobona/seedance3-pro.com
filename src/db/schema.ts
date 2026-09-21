import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Product-owned fields reserved for access, quotas, credits, and billing.
  role: text('role').default('user').notNull(),
  plan: text('plan').default('free').notNull(),
  generationCount: integer('generation_count').default(0).notNull(),
  monthlyGenerationCount: integer('monthly_generation_count').default(0).notNull(),
  generationLimit: integer('generation_limit').default(0).notNull(),
  creditBalance: integer('credit_balance').default(15).notNull(),
  trialCreditsGrantedAt: timestamp('trial_credits_granted_at', { withTimezone: true }).defaultNow().notNull(),
  paymentCustomerId: text('payment_customer_id'),
  subscriptionStatus: text('subscription_status').default('inactive').notNull(),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
})

export const generationCreditReservation = pgTable('generation_credit_reservation', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  credits: integer('credits').notNull(),
  status: text('status').default('reserved').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('generation_credit_reservation_user_idx').on(table.userId),
  index('generation_credit_reservation_status_idx').on(table.status),
])

export const videoGenerationTask = pgTable('video_generation_task', {
  id: text('id').primaryKey(),
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
  nextPollAt: timestamp('next_poll_at', { withTimezone: true }),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('video_generation_task_provider_task_idx').on(table.providerTaskId),
  uniqueIndex('video_generation_task_reservation_idx').on(table.reservationId),
  index('video_generation_task_user_status_idx').on(table.userId, table.status),
  index('video_generation_task_poll_due_idx').on(table.status, table.nextPollAt),
  check('video_generation_task_status_check', sql`${table.status} IN ('submitting', 'submission_unknown', 'queued', 'running', 'succeeded', 'failed', 'expired')`),
  check('video_generation_task_duration_check', sql`${table.duration} > 0`),
  check('video_generation_task_poll_attempts_check', sql`${table.pollAttempts} >= 0`),
])

export const launchWaitlist = pgTable('launch_waitlist', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  bonusCredits: integer('bonus_credits').default(5).notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  bonusGrantedAt: timestamp('bonus_granted_at', { withTimezone: true }),
}, (table) => [
  check('launch_waitlist_bonus_credits_check', sql`${table.bonusCredits} > 0`),
])

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [uniqueIndex('session_token_idx').on(table.token)])

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('account_provider_idx').on(table.providerId, table.accountId)])

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [uniqueIndex('verification_identifier_idx').on(table.identifier)])

export const authSchema = { user, session, account, verification }
