import type { RefundRequestStore } from '../db/refund-requests'

export type RefundEnvironment={REFUND_ADMIN_USER_IDS?:string}
type Deps={store:RefundRequestStore;environment:RefundEnvironment;getSession:(request:Request)=>Promise<{user:{id:string}}|null>}
class RefundError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}})
const errorResponse=(error:unknown)=>error instanceof RefundError?json({code:error.code,error:error.message},error.status):json({code:'REFUND_UNAVAILABLE',error:'Could not process your request. Please try again.'},503)
export function canReviewRefunds(id:string,env:RefundEnvironment){return Boolean(id&&env.REFUND_ADMIN_USER_IDS?.split(',').map(s=>s.trim()).includes(id))}
async function owner(request:Request,deps:Deps,admin=false){
  const session=await deps.getSession(request),id=session?.user.id
  if(!id||/^guest[:-]/.test(id))throw new RefundError(401,'AUTH_REQUIRED','Please log in.')
  if(admin&&!canReviewRefunds(id,deps.environment))throw new RefundError(403,'ADMIN_REQUIRED','Access denied.')
  return id
}
export async function readRefundInput(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new RefundError(403,'INVALID_ORIGIN','Please submit from this website.')
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new RefundError(400,'INVALID_REQUEST','Invalid request.')
  const reader=request.body?.getReader();if(!reader)throw new RefundError(400,'INVALID_REQUEST','Missing request.')
  let size=0;const parts:Uint8Array[]=[]
  try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>12000){await reader.cancel();throw new RefundError(413,'PAYLOAD_TOO_LARGE','Request is too large.')}parts.push(next.value)}}finally{reader.releaseLock()}
  const buffer=new Uint8Array(size);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length}
  try {const parsed=JSON.parse(new TextDecoder().decode(buffer));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed as Record<string,unknown>}
  catch {throw new RefundError(400,'INVALID_REQUEST','Invalid request.')}
}
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)
export async function submitRefundRequest(request:Request,deps:Deps){
  try{
    const userId=await owner(request,deps),body=await readRefundInput(request)
    const reason=typeof body.reason==='string'?body.reason.trim():''
    if(!validId(body.orderId)||reason.length<5||reason.length>2000)throw new RefundError(400,'INVALID_REQUEST','Please enter a reason between 5 and 2,000 characters.')
    const order=await deps.store.orderForOwner(body.orderId,userId)
    if(!order)throw new RefundError(404,'ORDER_NOT_FOUND','Order not found.')
    const existing=await deps.store.forOrder(order.id,userId)
    if(existing)return json({request:existing})
    if(order.status!=='paid')throw new RefundError(409,'ORDER_NOT_PAID','Only paid orders can be submitted for review.')
    const result=await deps.store.submit(userId,order.id,reason,body.locale==='zh'?'zh':'en')
    if(!result)throw new RefundError(409,'ORDER_CHANGED','The order has changed. Please refresh.')
    return json({request:result},201)
  }catch(error){return errorResponse(error)}
}
export async function listRefundRequests(request:Request,deps:Deps){
  try{
    await owner(request,deps,true)
    const params=new URL(request.url).searchParams,id=params.get('id')
    if(id){if(!validId(id))throw new RefundError(400,'INVALID_REQUEST','Invalid request.');const item=await deps.store.adminRequest(id);return json({requests:item?[item]:[],nextCursor:null})}
    return json(await deps.store.adminPage(params.get('cursor')))
  }
  catch(error){return error instanceof TypeError?json({code:'INVALID_CURSOR',error:'Invalid cursor.'},400):errorResponse(error)}
}
export async function reviewRefundRequest(request:Request,deps:Deps){
  try{
    const actor=await owner(request,deps,true),body=await readRefundInput(request)
    const note=typeof body.note==='string'?body.note.trim():''
    if(!validId(body.id)||!['approved','rejected'].includes(String(body.status))||!Number.isSafeInteger(body.version)||Number(body.version)<0||note.length>2000||(body.status==='rejected'&&note.length<5))throw new RefundError(400,'INVALID_REQUEST','Please provide a valid decision and an explanation for a rejection.')
    const current=await deps.store.adminRequest(body.id)
    if(!current)throw new RefundError(404,'REQUEST_NOT_FOUND','Request not found.')
    const result=await deps.store.review(body.id,actor,body.status as 'approved'|'rejected',note,Number(body.version))
    if(!result)throw new RefundError(409,'REQUEST_CHANGED','This request was already reviewed. Please refresh.')
    return json({request:result})
  }catch(error){return errorResponse(error)}
}
export async function authorizeRefundSync(request:Request,deps:Deps){
  try{await owner(request,deps,true);const body=await readRefundInput(request);if(!validId(body.id))throw new RefundError(400,'INVALID_REQUEST','Invalid request.');const item=await deps.store.adminRequest(body.id);if(!item)throw new RefundError(404,'REQUEST_NOT_FOUND','Request not found.');return {item}}
  catch(error){return {response:errorResponse(error)}}
}
