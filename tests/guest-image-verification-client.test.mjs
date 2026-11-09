import assert from 'node:assert/strict';
import test from 'node:test';
import { requestImageGeneration } from '../app/image-generation.mjs';

test('guest image client completes the image challenge once and preserves the reference and model on retry', async () => {
  let calls = 0, checks = 0;
  const image = new File(['reference bytes'], 'reference.png', {type:'image/png'});
  const result = await requestImageGeneration({
    model:'gpt-image-2', prompt:'A cat', referenceFile:image,
    fetchImpl:async(url,init)=>{
      assert.equal(url,'/api/images/generate');
      const form = await new Request('https://seedance3-pro.com'+url,init).formData();
      assert.equal(form.get('prompt'),'A cat');
      assert.equal(form.get('model'),'gpt-image-2');
      assert.equal(await form.get('image').text(),'reference bytes');
      if (++calls===1) return Response.json({code:'GUEST_VERIFICATION_REQUIRED',verification:{siteKey:'public',action:'guest_image_generate'}},{status:403});
      assert.equal(new Headers(init.headers).get('x-seedance-verification'),'fresh-image-token');
      return Response.json({success:true,image:{url:'https://example.test/output.png'}});
    },
    verifyImpl:async(options)=>{
      checks++;
      assert.equal(options.action,'guest_image_generate');
      return 'fresh-image-token';
    },
  });
  assert.equal(result.image.url,'https://example.test/output.png');
  assert.equal(calls,2);
  assert.equal(checks,1);
});

test('cancelled image verification never sends a generation retry',async()=>{
  let calls=0;
  await assert.rejects(requestImageGeneration({prompt:'A cat',fetchImpl:async()=>{
    calls++;
    return Response.json({code:'GUEST_VERIFICATION_REQUIRED',verification:{siteKey:'public',action:'guest_image_generate'}},{status:403});
  },verifyImpl:async()=>{throw Error('cancelled')}}),/cancelled/);
  assert.equal(calls,1);
});
