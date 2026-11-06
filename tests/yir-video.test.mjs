import test from 'node:test';
import assert from 'node:assert/strict';
import {buildYirVideoRequest, submitYirVideoTask, queryYirVideoTask} from '../scripts/yir-video.mjs';
const input={prompt:'A cloud drifts over a mountain',duration:5,resolution:'768p',aspectRatio:'16:9'};
test('guest request locks model, channel, five seconds and one output',()=>{
 const body=buildYirVideoRequest(input);
 assert.equal(body.model,'minimax/minimax-h3');assert.deepEqual(body.routing,{only:['metaso'],fallback:false});
 assert.deepEqual(body.parameters,{duration:5,resolution:'768P',aspect_ratio:'16:9',generate_audio:true,n:1});
 for(const change of [{duration:10},{resolution:'1080p'},{referenceImageUrls:['https://a.example/a','https://a.example/b']}]) assert.throws(()=>buildYirVideoRequest({...input,...change}));
});
test('reference uses first frame with adaptive ratio; rejects private URLs',()=>{
 const body=buildYirVideoRequest({...input,referenceImageUrls:['https://images.example/a.png']});
 assert.equal(body.input.type,'image');assert.equal(body.parameters.aspect_ratio,'adaptive');assert.deepEqual(body.input.references,[{role:'first_frame',url:'https://images.example/a.png'}]);
 assert.throws(()=>buildYirVideoRequest({...input,referenceImageUrls:['http://localhost/image']}));
});
test('submission uses bearer key and stable idempotency, reads top-level job ID',async()=>{
 assert.deepEqual(await submitYirVideoTask(input,{apiKey:'test-only',localTaskId:'local-1',fetchImpl:async(url,init)=>{
 assert.equal(url,'https://gateway.yir.ai/v1/videos/generations');assert.equal(init.headers.Authorization,'Bearer test-only');assert.equal(init.headers['Idempotency-Key'],'seedance-video:local-1');
 return Response.json({id:'job_test',status:'queued'},{status:202});}}),{providerTaskId:'job_test'});
});
test('query maps in-flight, failure and result; unknown responses never refund or resubmit',async()=>{
 const query=body=>queryYirVideoTask('job_test',{apiKey:'test-only',fetchImpl:async(url)=>{assert.equal(url,'https://gateway.yir.ai/v1/jobs/job_test');return Response.json(body);}});
 for(const status of ['queued','running','delivering'])assert.deepEqual(await query({status}),{status:'running',terminal:false});
 for(const status of ['failed','cancelled'])assert.deepEqual(await query({status}),{status:'failed',terminal:true});
 assert.deepEqual(await query({status:'succeeded',result:{files:[{media_type:'video/mp4',url:'https://cdn.example/video.mp4'}]}}),{status:'succeeded',terminal:true,videoUrl:'https://cdn.example/video.mp4'});
 assert.deepEqual(await query({}),{status:'unknown',terminal:false});
 await assert.rejects(query({status:'succeeded',result:{files:[]}}),e=>e.retriable===true);
});
test('ambiguous submission stays pending, query failure is retriable',async()=>{
 const fetchImpl=async()=>{throw Error('network')};
 await assert.rejects(submitYirVideoTask(input,{apiKey:'test-only',localTaskId:'local-1',fetchImpl}),e=>e.ambiguous===true);
 await assert.rejects(queryYirVideoTask('job_test',{apiKey:'test-only',fetchImpl}),e=>e.retriable===true);
});
