import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchWithGuestVideoVerification } from '../app/guest-video-verification.mjs';

const challenge = () => Response.json({ code:'GUEST_VERIFICATION_REQUIRED', verification:{siteKey:'public-key',action:'guest_video_generate'} },{status:403});
test('only a pre-generation challenge triggers a single verified retry, preserving request content', async () => {
  let calls = 0, verifications = 0;
  const response = await fetchWithGuestVideoVerification('/api/videos/generate', {
    method:'POST', body:'{"prompt":"keep"}', headers:{'content-type':'application/json'}, credentials:'same-origin',
  }, async (_url, init) => {
    if (++calls === 1) return challenge();
    assert.equal(new Headers(init.headers).get('x-seedance-verification'),'fresh-token');
    assert.equal(init.body,'{"prompt":"keep"}');
    assert.equal(init.credentials,'same-origin');
    return Response.json({success:true},{status:202});
  }, async options => {
    verifications++;
    assert.equal(options.siteKey,'public-key');
    assert.equal(options.action,'guest_video_generate');
    return 'fresh-token';
  });
  assert.equal(response.status,202);
  assert.equal(calls,2);
  assert.equal(verifications,1);
});

test('failed validation, quota errors and ambiguous submissions never auto-resubmit', async () => {
  for (const [status,code] of [[403,'GUEST_VERIFICATION_FAILED'],[402,'INSUFFICIENT_CREDITS'],[503,'VIDEO_SERVICE_UNAVAILABLE'],[202,'']]) {
    let calls = 0;
    const response = await fetchWithGuestVideoVerification('/api/videos/generate',{},async () => {calls++;return Response.json({code},{status});},async()=>assert.fail('must not verify'));
    assert.equal(response.status,status);
    assert.equal(calls,1);
  }
});

test('cancelled verification cannot submit a generation and retry challenges cannot loop', async () => {
  let calls = 0;
  await assert.rejects(fetchWithGuestVideoVerification('/api/videos/generate',{},async()=>{calls++;return challenge();},async()=>{throw new Error('cancelled');}),/cancelled/);
  assert.equal(calls,1);
  calls = 0;
  const response = await fetchWithGuestVideoVerification('/api/videos/generate',{},async()=>{calls++;return challenge();},async()=>'token');
  assert.equal(calls,2);
  assert.equal(response.status,403);
});

test('one challenge covers the combined image and generation request without losing the file on retry', async () => {
  const form = new FormData();
  form.append('payload', JSON.stringify({prompt:'Animate',duration:5,resolution:'768p',aspectRatio:'16:9'}));
  form.append('reference', new Blob(['image bytes'], {type:'image/png'}), 'reference.png');
  let requests = 0, checks = 0;
  const response = await fetchWithGuestVideoVerification('/api/videos/generate', {
    method:'POST', body:form, credentials:'same-origin', headers:{'x-seedance-device':'device'},
  }, async (url, init) => {
    assert.equal(url, '/api/videos/generate');
    const parsed = await new Request('https://seedance3-pro.com'+url, init).formData();
    assert.equal(await parsed.get('reference').text(), 'image bytes');
    assert.equal(JSON.parse(parsed.get('payload')).duration, 5);
    if (++requests === 1) return challenge();
    assert.equal(new Headers(init.headers).get('x-seedance-verification'), 'fresh-token');
    return Response.json({success:true}, {status:202});
  }, async () => { checks++; return 'fresh-token'; });
  assert.equal(response.status,202);
  assert.equal(requests,2);
  assert.equal(checks,1);
});
