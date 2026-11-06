import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { creationAccess } from '../../lib/creation-access'
import { findCreation } from '../../lib/creation-library'
import { creationMediaResponse } from '../../lib/creation-storage'
async function serve({request}:{request:Request}) {
  try {
    const {db,owners}=await creationAccess(request,env)
    const row=await findCreation(db,owners,new URL(request.url).searchParams.get('id')??'')
    if(!row || row.status!=='succeeded')return new Response(null,{status:404,headers:{'cache-control':'no-store'}})
    return await creationMediaResponse(request,row,env.VIDEO_REFERENCES)
  } catch {return new Response(null,{status:503,headers:{'cache-control':'no-store'}})}
}
export const Route=createFileRoute('/api/creations/media')({server:{handlers:{GET:serve,HEAD:serve}}})
