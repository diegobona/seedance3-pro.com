import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {createD1TestDatabase} from './helpers/d1-test-db'
import {createGuestImageTrialStore} from '../src/db/guest-image-trials'
import {createGuestVideoTrialStore} from '../src/db/guest-video-trials'
import {resolveGuestImageTrial} from '../src/lib/guest-image-trial'
import {resolveGuestVideoTrial} from '../src/lib/guest-video-trial'
import {reconcileGuestCredits} from '../src/lib/guest-credit-reconciliation'
import {transferImageWithGuestAccess} from '../src/lib/guest-image-animation'
import {prepareImageAnimation} from '../src/lib/image-to-video'
import {createD1VideoGenerationTaskStore} from '../src/db/d1-video-generation-tasks'
import {createD1GenerationCreditStore} from '../src/db/d1-generation-credits'
const secret='claimed-guest-access-secret-more-than-thirty-two'
function request(path='/',cookie='',method='GET'){return new Request(`https://seedance3-pro.com${path}`,{method,headers:{cookie,'cf-connecting-ip':'203.0.113.60',origin:'https://seedance3-pro.com'}})}
async function fixture(){
 const h=await createD1TestDatabase();const imageStore=createGuestImageTrialStore(h.db),videoStore=createGuestVideoTrialStore(h.db)
 const image=(await resolveGuestImageTrial(request(),{secret,store:imageStore,create:true}))!
 const video=(await resolveGuestVideoTrial(request(),{secret,store:videoStore,create:true}))!
 const cookie=`${image.setCookie!.split(';')[0]}; ${video.setCookie!.split(';')[0]}`
 await h.db.prepare(`INSERT INTO "user"(id,name,email) VALUES ('owner','Owner','owner@test'),('other','Other','other@test')`).run()
 const saved=new Map<string,object>()
 const bucket={put:async(key:string,value:string|Uint8Array,metadata:object)=>{saved.set(key,{size:value.length,text:async()=>String(value),...metadata})},get:async(key:string)=>saved.get(key)??null} as unknown as R2Bucket
 return {...h,imageStore,videoStore,image,video,cookie,bucket,saved}
}
async function loadRoute(name:string,db:D1Database,bucket:R2Bucket,accountId:string){
 const file=new URL(`../src/routes/api/videos/${name}.ts`,import.meta.url),fallback=createRequire(file)
 const environment={BETTER_AUTH_SECRET:secret,VIDEO_REFERENCES:bucket,IMAGE_RATE_LIMITER:{limit:async()=>({success:true})}}
 const modules:Record<string,unknown>={
  '@tanstack/react-router':{createFileRoute:()=> (route:unknown)=>route},'@tanstack/react-start':{},'cloudflare:workers':{env:environment},
  '../../../db':{createAppDatabase:()=>db,databaseConfigured:()=>true},
  '../../../lib/auth':{createAuth:()=>({api:{getSession:async()=>({user:{id:accountId}})}})},
  '../../../lib/video-task-activity':{createTrackedVideoTaskStore:(store:unknown)=>store,createVideoTaskActivity:()=>({})},
  '../../../../scripts/autodl-video.mjs':{preflightVideoGenerationRequest:async()=>({ok:true,payload:{prompt:'test',duration:5,resolution:'768p',aspectRatio:'16:9'}})},
  '../../../lib/video-providers':{selectVideoWorkflow:()=> 'minimax-h3',assertVideoProviderConfigured:()=>{},submitVideoTask:async()=>({providerTaskId:'synthetic-provider-task'}),queryVideoTask:async()=>({status:'succeeded',terminal:true,videoUrl:'https://example.com/video.mp4'})},
 }
 const exports={} as {Route:{server:{handlers:{POST?:(input:{request:Request})=>Promise<Response>;GET?:(input:{request:Request})=>Promise<Response>}}}}
 const compiled=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 runInNewContext(compiled,{exports,require:(id:string)=>modules[id]??fallback(id),Request,Response,Headers,URL,crypto,console,Date})
 return exports.Route.server.handlers
}
test('claimed guest cookie permits signed-in video generation and only debits the account',async()=>{
 const h=await fixture();try{
 await reconcileGuestCredits(request('/',h.cookie),'owner',secret,h.db)
 const route=await loadRoute('generate',h.db,h.bucket,'owner')
 const response=await route.POST!({request:request('/api/videos/generate',h.cookie,'POST')})
 assert.equal(response.status,202)
 assert.equal(await createD1GenerationCreditStore(h.db).getBalance('owner'),5)
 assert.equal(await createD1GenerationCreditStore(h.db).getBalance(h.video.session.user.id),0)
 }finally{await h.dispose()}
})
test('signed-in owner can poll a claimed pending guest video; another account cannot',async()=>{
 const h=await fixture();try{
 const store=createD1VideoGenerationTaskStore(h.db)
 const reserved=await store.reserveAndCreate(h.video.session.user.id,5,{workflowId:'minimax-h3',duration:5,resolution:'768p',aspectRatio:'16:9'});assert.ok(reserved)
 await store.attachProviderTask(reserved.task.id,'existing-provider-task')
 await reconcileGuestCredits(request('/',h.cookie),'owner',secret,h.db)
 const owner=await loadRoute('status',h.db,h.bucket,'owner'),other=await loadRoute('status',h.db,h.bucket,'other')
 const response=await owner.GET!({request:request(`/api/videos/status?task=${reserved.task.id}`,h.cookie)})
 assert.equal(response.status,200)
 assert.equal(response.headers.get('x-seedance-credit-scope'),'guest-video')
 const denied=await other.GET!({request:request(`/api/videos/status?task=${reserved.task.id}`,h.cookie)})
 assert.equal(denied.status,404)
 }finally{await h.dispose()}
})
test('claimed guest image remains available for its signed-in owner to animate, with no guest spend',async()=>{
 const h=await fixture();try{
 const [image]=await prepareImageAnimation([{url:'https://example.com/image.png'}],h.image.session.user.id,h.bucket)
 await reconcileGuestCredits(request('/',h.cookie),'owner',secret,h.db)
 const options={secret,imageStore:h.imageStore,videoStore:h.videoStore,bucket:h.bucket,limiter:{limit:async()=>({success:true})},fetchImpl:(async()=>new Response(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),{headers:{'content-type':'image/png'}})) as typeof fetch}
 const response=await transferImageWithGuestAccess(request(`/api/images/animate?image=${image.animateId}`,h.cookie,'POST'),{...options,getSession:async()=>({user:{id:'owner'}})})
 assert.equal(response.status,201)
 const body=await response.json() as {id:string}
 assert.equal((h.saved.get(`references/${body.id}`) as {customMetadata:{userId:string}}).customMetadata.userId,'owner')
 const other=await transferImageWithGuestAccess(request(`/api/images/animate?image=${image.animateId}`,h.cookie,'POST'),{...options,getSession:async()=>({user:{id:'other'}})})
 assert.equal(other.status,404)
 assert.equal(await h.videoStore.getBalance(h.video.session.user.id),0)
 await assert.rejects(resolveGuestVideoTrial(request('/',h.cookie),{secret,store:h.videoStore,create:true}),/already claimed/)
 }finally{await h.dispose()}
})
