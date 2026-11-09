import test from 'node:test';
import assert from 'node:assert/strict';
import { requestVideoGeneration } from '../app/video-generation.mjs';
const id = 'b3780b3b-26b4-4e5e-8df1-be861e324019';
test('guest reference and frame uploads use one verified submission with explicit mode and stable image order',async()=>{
  for(const [inputMode,count] of [['reference',5],['frames',2],['frames',1]]) {
    let submissions=0;
    await requestVideoGeneration({prompt:'Wave',inputMode,referenceFiles:Array.from({length:count},(_,i)=>new File([String(i)],`${i}.png`,{type:'image/png'})),
      prepareReferenceImpl:async file=>file,waitImpl:async()=>{},fetchImpl:async(url,init)=>{
        assert.notEqual(url,'/api/videos/references');
        if(url==='/api/videos/generate') {
          submissions++;
          assert.ok(init.body instanceof FormData);
          assert.equal(JSON.parse(init.body.get('payload')).inputMode,inputMode);
          assert.deepEqual(await Promise.all(init.body.getAll('reference').map(file=>file.text())),Array.from({length:count},(_,i)=>String(i)));
          return Response.json({success:true,task:{id,status:'queued'}});
        }
        return Response.json({success:true,task:{id,status:'succeeded',resultUrl:'https://example.test/video.mp4'}});
      }});
    assert.equal(submissions,1);
  }
});
test('invalid guest image counts never upload or submit',async()=>{
  for(const [inputMode,count] of [['reference',6],['frames',3],['frames',0],['text',1]]) {
    let calls=0;
    await assert.rejects(requestVideoGeneration({prompt:'Wave',inputMode,
      referenceFiles:Array.from({length:count},()=>new File(['x'],'x.png',{type:'image/png'})),
      fetchImpl:async()=>{calls++;throw Error('unexpected request');},prepareReferenceImpl:async file=>file}));
    assert.equal(calls,0);
  }
});

test('only the guest reference mode converts mentions; the signed-in legacy request stays unchanged', async () => {
  for (const inputMode of ['reference', undefined]) {
    let sentPrompt;
    await requestVideoGeneration({ prompt: '@Image 1 waves', inputMode,
      referenceFiles: [new File(['image'], 'one.png', { type: 'image/png' })],
      prepareReferenceImpl: async file => file, waitImpl: async () => {}, fetchImpl: async (url, init) => {
        if (url === '/api/videos/generate') {
          sentPrompt = JSON.parse(init.body.get('payload')).prompt;
          return Response.json({ success: true, task: { id, status: 'queued' } });
        }
        return Response.json({ success: true, task: { id, status: 'succeeded', resultUrl: 'https://example.test/video.mp4' } });
      } });
    assert.equal(sentPrompt, inputMode ? '<Picture 1> waves' : '@Image 1 waves');
  }
});
