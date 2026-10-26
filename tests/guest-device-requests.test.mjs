import assert from 'node:assert/strict';
import test from 'node:test';
import { guestDeviceHeaders } from '../assets/guest-device.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { requestVideoGeneration } from '../app/video-generation.mjs';
import { prepareImageForVideo } from '../app/image-to-video.mjs';
import { createCreditSummaryController } from '../app/studio-controls.mjs';
import { loadSiteAccount } from '../assets/site-account.mjs';

test('generation, reference uploads, handoff and balance requests send the same device digest', async () => {
  const saved = Object.fromEntries(['document','navigator','screen'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  const gl = { getExtension: name => name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 1 } : null,
    getParameter: () => 'ANGLE (Intel, Intel(R) Arc(TM) B370 GPU (0x0000B081) Direct3D11 vs_5_0 ps_5_0, D3D11)' };
  const ctx = { font: '', measureText() { return { width: this.font.includes('"') ? 120 : 100 }; } };
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { documentElement: { lang: 'en' }, createElement: () => ({ getContext: type => type === 'webgl' ? gl : ctx }) } },
    navigator: { configurable: true, value: { userAgent: 'Windows Chrome/130', hardwareConcurrency: 16 } },
    screen: { configurable: true, value: { width: 1920, height: 1080, colorDepth: 24 } },
  });
  try {
    const expected = (await guestDeviceHeaders())['x-seedance-device'];
    assert.match(expected, /^v1:[a-f0-9]{64}$/);
    const requests = [];
    const fetchImpl = async (url, init) => {
      requests.push({ url, init });
      return Response.json({ success: false, message: 'Test stopped before generation' }, { status: 403 });
    };
    await assert.rejects(requestImageGeneration({ prompt: 'test', fetchImpl }));
    await assert.rejects(requestVideoGeneration({ prompt: 'test', fetchImpl }));
    const file = new File(['image'], 'test.png', { type: 'image/png' });
    await assert.rejects(requestVideoGeneration({ prompt: 'test', referenceFiles: [file], prepareReferenceImpl: async () => file, fetchImpl }));
    await assert.rejects(prepareImageForVideo({ image: { animateId: '11111111-1111-4111-8111-111111111111' }, width: 1, height: 1, fetchImpl }));
    const quantityControl = new EventTarget(); quantityControl.value = '1';
    const controller = createCreditSummaryController({ quantityControl, costElement: {}, currentBalanceElement: {},
      container: { classList: { toggle() {} } }, eventTarget: new EventTarget(), fetchImpl });
    await controller.loadBalance(); controller.destroy();
    assert.deepEqual(requests.map(r => r.url), ['/api/images/generate','/api/videos/generate','/api/videos/references',
      '/api/images/animate?image=11111111-1111-4111-8111-111111111111','/api/credits/balance']);
    for (const { init } of requests) assert.equal(new Headers(init.headers).get('x-seedance-device'), expected);
    let accountBalanceHeaders;
    await loadSiteAccount({ fetchImpl: async (url, init) => {
      if (url.includes('/auth/')) return Response.json({ user: { id: 'account' } });
      accountBalanceHeaders = init.headers;
      return Response.json({ credits: { remaining: 10 } });
    } });
    assert.equal(new Headers(accountBalanceHeaders).get('x-seedance-device'), expected, 'public account balance also marks signed-in devices');
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];
    }
  }
});
