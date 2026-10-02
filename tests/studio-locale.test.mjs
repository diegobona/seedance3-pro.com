import test from 'node:test';
import assert from 'node:assert/strict';
import { currentLocale, t, localizedErrorMessage } from '../app/i18n.mjs';
import { validateImageReferences } from '../app/image-references.mjs';
import { prepareImageForVideo } from '../app/image-to-video.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { requestVideoGeneration } from '../app/video-generation.mjs';
import { buildModelUrl } from '../app/model-routing.mjs';
import { buildPoseShareUrl } from '../app/pose-share.mjs';
import { POSE_LIBRARY } from '../app/pose-library.mjs';
import { ANIMAL_CATALOG, getAnimalPresets, ANIMAL_HANDLE_SPECS } from '../app/pose-animals.mjs';
import { createLaunchWaitlistController } from '../app/launch-waitlist.mjs';
import { createPoseResultActionsController } from '../app/pose-result-actions.mjs';
import { applyPromptStructure, examplePromptAt, createCreditSummaryController } from '../app/studio-controls.mjs';

async function inLocale(locale, run) {
  const originalWindow = globalThis.window;
  globalThis.window = { location: { pathname: locale === 'zh' ? '/zh/app/' : '/app/' } };
  try { return await run(); }
  finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test('dynamic UI re-evaluates locale and keeps unknown strings and user values intact', async () => {
  await inLocale('zh', () => {
    assert.equal(currentLocale(), 'zh');
    assert.equal(t('Generating…'), '生成中…');
    assert.equal(t('Image {number}: {name}', { number: 2, name: 'my photo.png' }), '图片 2：my photo.png');
    assert.equal(t('toString'), 'toString');
    assert.equal(t('SEEDANCE 2.5'), 'SEEDANCE 2.5');
    assert.equal(t('Generating…', {}, 'en'), 'Generating…');
    assert.equal(localizedErrorMessage('Provider detail', 'AUTH_REQUIRED'), '请登录后继续。');
    assert.equal(localizedErrorMessage('Provider detail', '', 'Image generation failed.'), '图片生成失败，请重试。');
  });
  await inLocale('en', () => {
    assert.equal(t('Generating…'), 'Generating…');
    assert.equal(localizedErrorMessage('Provider detail', 'AUTH_REQUIRED'), 'Provider detail');
  });
});

test('Chinese image validation reports format and upload limits in Chinese', async () => {
  const file = { type: 'image/png', size: 1, arrayBuffer() {} };
  await inLocale('zh', () => {
    assert.equal(validateImageReferences([file]), '');
    assert.equal(validateImageReferences([{ ...file, type: 'text/plain' }]), '请选择 PNG、JPEG 或 WebP 图片。');
    assert.equal(validateImageReferences(Array(17).fill(file)), '最多可上传 16 张参考图片。');
    assert.equal(validateImageReferences([{ ...file, size: 11 * 1024 * 1024 }]), '每张参考图片不能为空，且不得超过 10 MB。');
  });
});

test('localized image requests preserve API URL, prompt and provider field values', async () => {
  await inLocale('zh', async () => {
    const prompt = 'A red fox，保留这段输入';
    const result = await requestImageGeneration({
      prompt, quantity: 2, size: '1536x1024',
      fetchImpl: async (url, options) => {
        assert.equal(url, '/api/images/generate');
        assert.equal(options.body.get('prompt'), prompt);
        assert.equal(options.body.get('quantity'), '2');
        assert.equal(options.body.get('resolution'), '1K');
        assert.equal(options.body.get('size'), '1536x1024');
        return Response.json({ success: true, image: { url: 'https://example.com/result.png' } });
      },
    });
    assert.equal(result.image.url, 'https://example.com/result.png');
    await assert.rejects(requestImageGeneration({
      prompt, fetchImpl: async () => Response.json({ success: false, message: 'Log in to generate images.', code: 'AUTH_REQUIRED' }, { status: 401 }),
    }), /请登录后生成图片/);
    assert.equal(applyPromptStructure('Original input').split('\n')[0], 'Subject: Original input');
    assert.match(examplePromptAt(0), /^A cinematic portrait/);
  });
});

test('localized video requests preserve provider enums and local API routes', async () => {
  const taskId = 'a1b2c3d4-1234-4123-8123-123456789abc';
  await inLocale('zh', async () => {
    const result = await requestVideoGeneration({
      prompt: 'Original camera motion', duration: 10, aspectRatio: '9:16',
      fetchImpl: async (url, options) => {
        assert.ok(url.startsWith('/api/videos/'));
        if (url === '/api/videos/generate') {
          assert.deepEqual(JSON.parse(options.body), {
            prompt: 'Original camera motion', duration: 10, resolution: '480p', aspectRatio: '9:16',
          });
          return Response.json({ success: true, task: { id: taskId, status: 'queued' } });
        }
        return Response.json({ success: true, task: { id: taskId, status: 'succeeded', resultUrl: 'https://example.com/video.mp4' } });
      },
    });
    assert.equal(result.status, 'succeeded');
    await assert.rejects(requestVideoGeneration({ referenceFiles: Array(10).fill({}) }), /最多 9 张参考图片/);
  });
});

test('image-to-video and Pose share URLs retain Chinese locale and scene/reference state', async () => {
  const referenceId = 'a1b2c3d4-1234-4123-8123-123456789abc';
  await inLocale('zh', async () => {
    const destination = await prepareImageForVideo({
      image: { animateId: referenceId }, width: 400, height: 800,
      fetchImpl: async (url) => {
        assert.equal(url, `/api/images/animate?image=${referenceId}`);
        return Response.json({ success: true, id: referenceId });
      },
    });
    assert.equal(destination, `/zh/app/video/minimax-h3?reference=${referenceId}&aspect_ratio=9%3A16`);
    assert.equal(buildModelUrl('https://example.com/zh/app/?reference=abc#editor', 'pose-to-image'), '/zh/app/?reference=abc&model=pose-to-image#editor');
    assert.equal(buildPoseShareUrl('https://example.com/zh/app/image/gpt-image-2?model=pose-to-image', 'scene-data'), 'https://example.com/zh/app/?model=pose-to-image#pose=scene-data');
    assert.equal(buildPoseShareUrl('https://example.com/app/image/gpt-image-2', 'scene-data'), 'https://example.com/app/?model=pose-to-image#pose=scene-data');
  });
});

test('Chinese Pose preset labels and joint handles are translated while category keys stay English', () => {
  for (const preset of POSE_LIBRARY) {
    assert.notEqual(t(preset.label, {}, 'zh'), preset.label, preset.label);
    assert.ok(['Standing', 'Gesture', 'Action', 'Seated', 'Floor'].includes(preset.category));
  }
  for (const species of Object.keys(ANIMAL_CATALOG)) {
    for (const preset of getAnimalPresets(species)) {
      assert.notEqual(t(preset.label, {}, 'zh'), preset.label, preset.label);
      assert.notEqual(t(preset.category, {}, 'zh'), preset.category, preset.category);
    }
  }
  for (const handle of ANIMAL_HANDLE_SPECS) assert.notEqual(t(handle.label, {}, 'zh'), handle.label, handle.label);
});

test('waitlist and Pose result buttons render Chinese after async state changes', async () => {
  await inLocale('zh', async () => {
    const button = new EventTarget();
    const statusElement = { textContent: '', className: '' };
    const controller = createLaunchWaitlistController({
      container: { hidden: true, dataset: {} }, button, statusElement, eventTarget: new EventTarget(),
      fetchImpl: async (url, options) => {
        assert.equal(url, '/api/launch-waitlist');
        return Response.json({ success: true, waitlist: { joined: options.method === 'POST', bonusCredits: 5 } });
      },
    });
    await controller.setVisible(true);
    assert.equal(button.textContent, '订阅上线通知并领取 5 积分');
    await controller.join();
    assert.equal(button.textContent, '已加入上线通知名单');
    assert.match(statusElement.textContent, /订阅成功/);
    controller.destroy();

    const generateAgainButton = new EventTarget();
    const actions = createPoseResultActionsController({ container: {}, editButton: new EventTarget(), generateAgainButton });
    actions.setGenerateState({ disabled: false, cost: 10 });
    assert.equal(generateAgainButton.textContent, '再次生成 · 10 积分');
    actions.destroy();
  });
});

test('credit summary updates remain localized when balance is fetched or changed', async () => {
  await inLocale('zh', async () => {
    const costElement = {}, currentBalanceElement = {};
    const events = new EventTarget();
    const quantityControl = new EventTarget();
    quantityControl.value = '2';
    const controller = createCreditSummaryController({
      container: { classList: { toggle() {} } }, costElement, currentBalanceElement,
      quantityControl, eventTarget: events,
      fetchImpl: async () => Response.json({ credits: { remaining: 25 } }),
    });
    assert.equal(costElement.textContent, '10 积分');
    assert.equal(currentBalanceElement.textContent, '— 积分');
    await controller.loadBalance();
    assert.equal(currentBalanceElement.textContent, '25 积分');
    events.dispatchEvent(new CustomEvent('seedance:credits-updated', { detail: { remaining: 15 } }));
    assert.equal(currentBalanceElement.textContent, '15 积分');
    controller.destroy();
  });
});
