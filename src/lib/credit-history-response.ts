import { isD1Database, type AppDatabase } from '../db'

export async function creditHistoryResponse(
  request: Request,
  db: AppDatabase,
  getSession: (request: Request) => Promise<{ user: { id: string } } | null>,
) {
  const session = await getSession(request)
  const headers = { 'cache-control': 'no-store' }
  if (!session?.user?.id) return Response.json({ error: 'Sign in to view credit history.' }, { status: 401, headers })
  if (!isD1Database(db)) return Response.json({ error: 'Credit history is temporarily unavailable.' }, { status: 503, headers })
  const rows = await db.prepare(`SELECT r.id,r.created_at,r.status,r.credits,r.daily_free_credits,
    CASE WHEN v.id IS NULL THEN 'image' ELSE 'video' END AS kind
    FROM generation_credit_reservation r
    LEFT JOIN video_generation_task v ON v.reservation_id=coalesce(r.guest_source_id,r.id)
    WHERE r.user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 50`)
    .bind(session.user.id).all<{
      id: string; created_at: number; status: string; credits: number; daily_free_credits: number; kind: string
    }>()
  return Response.json({ entries: rows.results.map(row => ({
    id: row.id, createdAt: new Date(row.created_at).toISOString(),
    kind: row.kind, status: row.status, credits: row.credits,
    dailyCredits: row.daily_free_credits, paidCredits: row.credits - row.daily_free_credits,
  })) }, { headers })
}
