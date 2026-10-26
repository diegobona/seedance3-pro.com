import assert from 'node:assert/strict';
import test from 'node:test';

// Optional import makes the initial failure describe the missing behavior.
const { fingerprintFromSignals = async () => null, collectGuestDeviceSignals = () => null } =
  await import('../assets/guest-device.mjs').catch(() => ({}));
const signals = {
  platform: 'windows', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  screen: [1920, 1080, 24], cores: 16, timezone: 'Asia/Shanghai',
  fonts: ['Arial', 'Calibri', 'Consolas', 'Microsoft YaHei', 'Segoe UI'],
};

test('device digest stays stable across browser names, GPU wrappers and screen orientation', async () => {
  const chrome = await fingerprintFromSignals({ ...signals, userAgent: 'Chrome/130', language: 'en-US' });
  const firefox = await fingerprintFromSignals({ ...signals, userAgent: 'Firefox/132', language: 'zh-CN',
    renderer: 'NVIDIA GeForce RTX 4060/PCIe/SSE2', screen: [1080, 1920, 24], fonts: [...signals.fonts].reverse() });
  assert.match(chrome ?? '', /^v1:[a-f0-9]{64}$/);
  assert.equal(chrome, firefox);
  assert.notEqual(await fingerprintFromSignals({ ...signals, cores: 8 }), chrome);
  assert.notEqual(await fingerprintFromSignals({ ...signals, renderer: 'AMD Radeon RX 6600' }), chrome);
});

test('unavailable or generic device signals do not put unrelated visitors into one fingerprint', async () => {
  for (const value of [null, {}, { ...signals, renderer: '' }, { ...signals, renderer: 'ANGLE (Google, Vulkan SwiftShader Device)' },
    { ...signals, renderer: 'Intel Inc.' }, { ...signals, fonts: [] }, { ...signals, cores: 0 }]) {
    assert.equal(await fingerprintFromSignals(value), null);
  }
  assert.equal(collectGuestDeviceSignals({}), null);
  assert.equal(collectGuestDeviceSignals({ document: { createElement() { throw new Error('privacy restriction'); } } }), null);
});

test('Apple GPU names match across Safari and ANGLE Metal wrappers', async () => {
  const safari = await fingerprintFromSignals({ ...signals, platform: 'mac', renderer: 'Apple M2' });
  const chrome = await fingerprintFromSignals({ ...signals, platform: 'mac', renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)' });
  assert.match(safari ?? '', /^v1:[a-f0-9]{64}$/);
  assert.equal(safari, chrome);
});
