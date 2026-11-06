export const CREATION_RETENTION_MS = 30 * 24 * 3600_000
export const CREATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAGE_SIZE = 24
export type CreationAsset = {
  id: string; user_id: string; kind: 'video' | 'image'; source_url: string | null
  storage_key: string | null; mime_type: string | null; prompt: string | null; model: string | null
  created_at: number; expires_at: number; archive_attempts: number; deleted_at: number | null
}
export type CreationRow = CreationAsset & { status: string; duration: number | null; aspect_ratio: string | null }

function selection(owners: string[]) {
  const slots = owners.map(()=>'?').join(',')
  return `SELECT v.id,v.user_id,'video' AS kind,coalesce(a.source_url,v.result_url) AS source_url,
    a.storage_key,a.mime_type,a.prompt,coalesce(a.model,v.workflow_id) AS model,
    v.created_at,coalesce(a.expires_at,v.created_at+${CREATION_RETENTION_MS}) AS expires_at,
    coalesce(a.archive_attempts,0) AS archive_attempts,a.deleted_at,v.status,v.duration,v.aspect_ratio
    FROM video_generation_task v LEFT JOIN creation_asset a ON a.id=v.id
    WHERE v.user_id IN (${slots}) AND a.deleted_at IS NULL
    UNION ALL
    SELECT a.id,a.user_id,a.kind,a.source_url,a.storage_key,a.mime_type,a.prompt,a.model,
      a.created_at,a.expires_at,a.archive_attempts,a.deleted_at,'succeeded' AS status,NULL AS duration,NULL AS aspect_ratio
    FROM creation_asset a WHERE a.kind='image' AND a.user_id IN (${slots}) AND a.deleted_at IS NULL`
}

export async function listCreations(db: D1Database, owners: string[], kind = 'all', cursor = '') {
  if (!['all','image','video'].includes(kind)) throw new TypeError('Invalid filter')
  let before: { time:number; id:string } | undefined
  if (cursor) {
    const [time,id,...rest] = cursor.split('_')
    if (rest.length || !/^\d{1,16}$/.test(time) || !CREATION_ID.test(id) || !Number.isSafeInteger(Number(time))) throw new TypeError('Invalid cursor')
    before = { time:Number(time),id }
  }
  if (!owners.length) return { items:[],nextCursor:null }
  const rows = await db.prepare(`SELECT * FROM (${selection(owners)})
    WHERE (?='all' OR kind=?) ${before ? 'AND (created_at<? OR (created_at=? AND id<?))' : ''}
    ORDER BY created_at DESC,id DESC LIMIT ${PAGE_SIZE+1}`).bind(...owners,...owners,kind,kind,
      ...(before ? [before.time,before.time,before.id] : [])).all<CreationRow>()
  const items = rows.results.slice(0,PAGE_SIZE)
  const last = items.at(-1)
  return {items,nextCursor:rows.results.length>PAGE_SIZE && last ? `${last.created_at}_${last.id}` : null}
}

export async function findCreation(db:D1Database, owners:string[], id:string) {
  if (!CREATION_ID.test(id) || !owners.length) return null
  return db.prepare(`SELECT * FROM (${selection(owners)}) WHERE id=? LIMIT 1`).bind(...owners,...owners,id).first<CreationRow>()
}

export function publicCreation(row:CreationRow, now=Date.now()) {
  const expired = row.expires_at <= now
  const available = row.status==='succeeded' && !expired && Boolean(row.storage_key || row.source_url)
  return {
    id:row.id,kind:row.kind,status:row.status,prompt:row.prompt ?? '',model:row.model ?? '',
    createdAt:new Date(row.created_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),
    duration:row.duration,aspectRatio:row.aspect_ratio,
    mediaState:expired ? 'expired' : row.storage_key ? 'saved' : row.archive_attempts>=3 ? 'unavailable' : 'saving',
    mediaUrl:available ? `/api/creations/media?id=${row.id}` : null,
    downloadUrl:available ? `/api/creations/media?id=${row.id}&download=1` : null,
  }
}

export async function recordVideoCreation(db:D1Database, id:string, userId:string, prompt:string, model:string, now=Date.now()) {
  await db.prepare(`INSERT OR IGNORE INTO creation_asset(id,user_id,kind,prompt,model,created_at,expires_at,mime_type)
    VALUES(?,?,'video',?,?,?,?,'video/mp4')`).bind(id,userId,prompt,model,now,now+CREATION_RETENTION_MS).run()
}

export async function hideCreation(db:D1Database, row:CreationRow, now=Date.now()) {
  if (['submitting','queued','running'].includes(row.status)) return false
  await db.prepare(`INSERT INTO creation_asset(id,user_id,kind,created_at,expires_at,deleted_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET deleted_at=excluded.deleted_at`)
    .bind(row.id,row.user_id,row.kind,row.created_at,row.expires_at,now).run()
  return true
}
