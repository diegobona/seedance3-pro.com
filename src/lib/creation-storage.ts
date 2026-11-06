import { CREATION_ID, CREATION_RETENTION_MS, type CreationAsset } from './creation-library'

const MAX_MEDIA_BYTES = 32 * 1024 * 1024
export function safeCreationSource(value:string) {
  try {
    const u=new URL(value)
    return u.protocol==='https:' && !u.username && !u.password && !u.port && u.href.length<8192
      && u.hostname.includes('.') && !/^[\d.]+$/.test(u.hostname) && !u.hostname.includes(':')
      && !/\.(?:local|internal|localhost)$/.test(u.hostname)
  } catch { return false }
}
function imageMime(bytes:Uint8Array) {
  if ([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return 'image/png'
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg'
  if (new TextDecoder().decode(bytes.subarray(0,4))==='RIFF' && new TextDecoder().decode(bytes.subarray(8,12))==='WEBP') return 'image/webp'
  return null
}
async function mediaBytes(response:Response) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length'))>MAX_MEDIA_BYTES) {await response.body?.cancel();throw new Error('Media unavailable')}
  const reader=response.body.getReader(), chunks:Uint8Array[]=[]
  let size=0
  try {
    while(true) {
      const {done,value}=await reader.read(); if(done)break
      size+=value.byteLength
      if(size>MAX_MEDIA_BYTES){await reader.cancel();throw new Error('Media too large')}
      chunks.push(value)
    }
  } finally {reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return bytes
}
async function fetchMedia(source:string, fetchImpl:typeof fetch) {
  let url=source
  const signal=AbortSignal.timeout(25_000)
  for(let i=0;i<4;i++) {
    if(!safeCreationSource(url))throw new Error('Invalid media source')
    const response=await fetchImpl(url,{redirect:'manual',signal})
    if(response.status>=300 && response.status<400 && response.headers.has('location')) {
      await response.body?.cancel();url=new URL(response.headers.get('location')!,url).href;continue
    }
    return mediaBytes(response)
  }
  throw new Error('Too many redirects')
}

export async function saveGeneratedImages(db:D1Database,bucket:R2Bucket,images:Array<{url?:string;dataUrl?:string;animateId?:string}>,userId:string,details:{prompt?:string;model?:string},now=Date.now()) {
  if(!await db.prepare('SELECT id FROM "user" WHERE id=? AND plan<>\'guest\'').bind(userId).first())return
  for(const image of images) {
    try {
      const id=CREATION_ID.test(image.animateId ?? '') ? image.animateId! : crypto.randomUUID()
      let storageKey:string|null=null, mime:string|null=null
      const source=image.url && safeCreationSource(image.url) ? image.url : null
      if(!source && image.dataUrl && image.dataUrl.length<MAX_MEDIA_BYTES*1.4) {
        const match=/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(image.dataUrl)
        if(match) {
          const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));mime=imageMime(bytes)
          if(mime && bytes.byteLength<=MAX_MEDIA_BYTES) {
            storageKey=`creations/${id}`
            await bucket.put(storageKey,bytes,{httpMetadata:{contentType:mime}})
          }
        }
      }
      if(!source && !storageKey)continue
      await db.prepare(`INSERT OR IGNORE INTO creation_asset
        (id,user_id,kind,source_url,storage_key,mime_type,prompt,model,created_at,expires_at)
        VALUES(?,?,'image',?,?,?,?,?,?,?)`).bind(id,userId,source,storageKey,mime,
          (details.prompt ?? '').slice(0,10000),details.model ?? '',now,now+CREATION_RETENTION_MS).run()
    } catch { console.error(JSON.stringify({event:'creation_image_save_deferred'})) }
  }
}

export async function archiveCreation(db:D1Database,bucket:R2Bucket,row:CreationAsset,fetchImpl:typeof fetch=fetch,now=Date.now()) {
  if(row.storage_key || row.deleted_at || row.expires_at<=now || !row.source_url)return
  const key=`creations/${row.id}`
  try {
    const bytes=await fetchMedia(row.source_url,fetchImpl)
    const mime=row.kind==='image' ? imageMime(bytes) : new TextDecoder().decode(bytes.subarray(4,8))==='ftyp' ? 'video/mp4' : null
    if(!mime)throw new Error('Unsupported media')
    await bucket.put(key,bytes,{httpMetadata:{contentType:mime}})
    const saved=await db.prepare(`UPDATE creation_asset SET storage_key=?,mime_type=?
      WHERE id=? AND deleted_at IS NULL AND expires_at>?`).bind(key,mime,row.id,now).run()
    if(!saved.meta.changes)await bucket.delete(key)
  } catch {
    await db.prepare(`UPDATE creation_asset SET archive_attempts=archive_attempts+1,next_archive_at=? WHERE id=? AND storage_key IS NULL`)
      .bind(now+(row.archive_attempts+1)*120_000,row.id).run()
  }
}

async function importOldImages(db:D1Database,bucket:R2Bucket,now:number) {
  const checkpoint=await db.prepare("SELECT value FROM creation_maintenance WHERE key='image-import-v1'").first<{value:string}>()
  if(checkpoint?.value==='done')return
  const page=await bucket.list({prefix:'references/sources/',limit:50,include:['customMetadata'],...(checkpoint?.value?{cursor:checkpoint.value}:{})})
  for(const item of page.objects) {
    const id=item.key.split('/').at(-1)!, userId=item.customMetadata?.userId
    if(!CREATION_ID.test(id) || !userId || item.uploaded.getTime()+CREATION_RETENTION_MS<=now)continue
    const exists=await db.prepare('SELECT id FROM creation_asset WHERE id=?').bind(id).first()
    if(exists)continue
    const object=await bucket.get(item.key);if(!object || object.size>8192)continue
    const source=await object.text();if(!safeCreationSource(source))continue
    const created=item.uploaded.getTime()
    await db.prepare(`INSERT OR IGNORE INTO creation_asset(id,user_id,kind,source_url,created_at,expires_at)
      SELECT ?,?,'image',?,?,? WHERE EXISTS(SELECT 1 FROM "user" WHERE id=? AND plan<>'guest')`)
      .bind(id,userId,source,created,created+CREATION_RETENTION_MS,userId).run()
  }
  await db.prepare("INSERT INTO creation_maintenance(key,value) VALUES('image-import-v1',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .bind(page.truncated?page.cursor:'done').run()
}

export async function maintainCreationLibrary(env:{DB?:D1Database;VIDEO_REFERENCES?:R2Bucket},now=Date.now(),fetchImpl:typeof fetch=fetch) {
  const db=env.DB,bucket=env.VIDEO_REFERENCES;if(!db || !bucket)return
  try {
    await db.prepare(`INSERT OR IGNORE INTO creation_asset(id,user_id,kind,source_url,model,created_at,expires_at)
      SELECT v.id,v.user_id,'video',v.result_url,v.workflow_id,v.created_at,v.created_at+?
      FROM video_generation_task v JOIN "user" u ON u.id=v.user_id AND u.plan<>'guest' LEFT JOIN creation_asset a ON a.id=v.id
      WHERE v.status='succeeded' AND v.created_at>? AND a.id IS NULL ORDER BY v.created_at DESC LIMIT 12`)
      .bind(CREATION_RETENTION_MS,now-CREATION_RETENTION_MS).run()
    await db.prepare(`UPDATE creation_asset SET source_url=(SELECT result_url FROM video_generation_task WHERE id=creation_asset.id)
      WHERE kind='video' AND source_url IS NULL AND deleted_at IS NULL
      AND id IN (SELECT id FROM video_generation_task WHERE status='succeeded')`).run()
    await importOldImages(db,bucket,now)
    const pending=await db.prepare(`SELECT * FROM creation_asset WHERE storage_key IS NULL AND source_url IS NOT NULL
      AND deleted_at IS NULL AND expires_at>? AND next_archive_at<=? AND archive_attempts<3
      ORDER BY created_at DESC LIMIT 3`).bind(now,now).all<CreationAsset>()
    for(const row of pending.results)await archiveCreation(db,bucket,row,fetchImpl,now)
    const expired=await db.prepare('SELECT id,storage_key FROM creation_asset WHERE storage_key IS NOT NULL AND (deleted_at IS NOT NULL OR expires_at<=?) LIMIT 20')
      .bind(now).all<{id:string;storage_key:string}>()
    for(const row of expired.results) {
      await bucket.delete(row.storage_key)
      await db.prepare('UPDATE creation_asset SET storage_key=NULL,source_url=NULL WHERE id=?').bind(row.id).run()
    }
  } catch {console.error(JSON.stringify({event:'creation_maintenance_deferred'}))}
}

export async function creationMediaResponse(request:Request,row:CreationAsset,bucket:R2Bucket,fetchImpl:typeof fetch=fetch,now=Date.now()) {
  if(row.expires_at<=now)return new Response(null,{status:410})
  const download=new URL(request.url).searchParams.get('download')==='1'
  const headers=new Headers({'cache-control':'private, no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex','vary':'Cookie'})
  if(row.storage_key) {
    const object=await bucket.get(row.storage_key,{range:request.headers})
    if(!object)return new Response(null,{status:410})
    headers.set('content-type',object.httpMetadata?.contentType || row.mime_type || 'application/octet-stream')
    headers.set('accept-ranges','bytes')
    let status=200
    if(object.range && 'offset' in object.range && typeof object.range.offset==='number') {
      const length=object.range.length ?? object.size-object.range.offset
      headers.set('content-range',`bytes ${object.range.offset}-${object.range.offset+length-1}/${object.size}`)
      headers.set('content-length',String(length));status=206
    } else headers.set('content-length',String(object.size))
    if(download)headers.set('content-disposition',`attachment; filename="${row.kind}-${row.id}.${row.kind==='video'?'mp4':row.mime_type==='image/jpeg'?'jpg':row.mime_type==='image/webp'?'webp':'png'}"`)
    return new Response(request.method==='HEAD'?null:object.body,{status,headers})
  }
  if(!row.source_url || !safeCreationSource(row.source_url))return new Response(null,{status:410})
  // A fresh result is usable while its durable copy is queued. No client URL is accepted.
  const upstream=await fetchImpl(row.source_url,{method:request.method,redirect:'error',signal:AbortSignal.timeout(25000),
    headers:request.headers.has('range')?{range:request.headers.get('range')!}:{}})
  if(!upstream.ok)return new Response(null,{status:410})
  const type=upstream.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if(!['image/png','image/jpeg','image/webp','video/mp4','application/octet-stream'].includes(type)) {
    await upstream.body?.cancel();return new Response(null,{status:410})
  }
  headers.set('content-type',type)
  for(const key of ['content-length','content-range','accept-ranges'])if(upstream.headers.has(key))headers.set(key,upstream.headers.get(key)!)
  if(download)headers.set('content-disposition',`attachment; filename="${row.kind}-${row.id}.${row.kind==='video'?'mp4':type==='image/jpeg'?'jpg':type==='image/webp'?'webp':'png'}"`)
  return new Response(upstream.body,{status:upstream.status,headers})
}
