import test from 'node:test';
import assert from 'node:assert/strict';
import { SEEDANCE_VIDEO_EXAMPLES } from '../app/seedance-video-examples.mjs';
import { videoExamplePrompt, adaptVideoExamplePrompt } from '../app/video-example-prompt.mjs';

for (const example of SEEDANCE_VIDEO_EXAMPLES.filter(item => item.durationSeconds > 5)) {
  test(`${example.id}: explicit 5s variant, full version and existing links stay aligned`, () => {
    assert.ok(example.trialPrompt && example.trialPromptZh);
    for (const locale of ['en', 'zh']) {
      const full = locale === 'zh' ? example.promptZh : example.prompt;
      const trial = locale === 'zh' ? example.trialPromptZh : example.trialPrompt;
      assert.equal(videoExamplePrompt(example, 5, locale), trial);
      assert.equal(videoExamplePrompt(example, 10, locale), full);
      assert.equal(adaptVideoExamplePrompt(full, 5, locale), trial);
      assert.equal(adaptVideoExamplePrompt(trial, 10, locale), full);
      assert.equal(adaptVideoExamplePrompt(trial, 15, locale), full);
      assert.equal(adaptVideoExamplePrompt(trial, 5, locale), trial);
      assert.ok(trial.length <= 2500);
      assert.match(trial, locale === 'zh' ? /^5 秒/ : /^A 5-second/);
      assert.doesNotMatch(trial, /(?:5\.2|6\.7|8\.8)–|–10\s*(?:s|秒)/);
    }
  });
  test(`${example.id}: preserve edits when duration or balance changes`, () => {
    const custom = example.trialPrompt + '\nKeep the camera still.';
    assert.equal(adaptVideoExamplePrompt(custom, 10), custom);
    const editedFull = example.prompt.replace('16:9', '9:16');
    assert.equal(adaptVideoExamplePrompt(editedFull, 5), editedFull);
  });
}
test('other examples and custom prompts stay intact', () => {
  const other = SEEDANCE_VIDEO_EXAMPLES.find(item => !item.trialPrompt);
  assert.equal(videoExamplePrompt(other, 5), other.prompt);
  for (const text of ['', 'My original 10-second scene.', '10 秒原创镜头']) assert.equal(adaptVideoExamplePrompt(text, 5), text);
});
