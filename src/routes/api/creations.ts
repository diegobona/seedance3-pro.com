import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { creationAccess } from '../../lib/creation-access'
import { findCreation, hideCreation, listCreations, publicCreation } from '../../lib/creation-library'
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','vary':'Cookie'}})
export const Route=createFileRoute('/api/creations')({server:{handlers:{
  GET:async({request})=>{
    try {
      const {db,owners,guest}=await creationAccess(request,env)
      const url=new URL(request.url)
      const result=await listCreations(db,owners,url.searchParams.get('kind')??'all',url.searchParams.get('cursor')??'')
      return json({items:result.items.map(row=>publicCreation(row)),nextCursor:result.nextCursor,guest})
    } catch(error){return json({error:'Could not load creations.'},error instanceof TypeError?400:503)}
  },
  DELETE:async({request})=>{
    const url=new URL(request.url)
    if(request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Forbidden'},403)
    try {
      const {db,owners}=await creationAccess(request,env)
      const row=await findCreation(db,owners,url.searchParams.get('id')??'')
      if(!row)return json({error:'Not found'},404)
      if(!await hideCreation(db,row))return json({error:'This task is still processing.'},409)
      return json({success:true})
    } catch {return json({error:'Could not delete creation.'},503)}
  },
}}})
