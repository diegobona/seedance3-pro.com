import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReferenceMentions, removeReferenceFromPrompt, mentionQuery } from '../app/reference-mentions.mjs';

test('numbered mentions map to the same model images across languages', () => {
  assert.equal(normalizeReferenceMentions('@Image1 greets @Image 2，参考 @图片1', 2), '<Picture 1> greets <Picture 2>，参考 <Picture 1>');
  assert.equal(normalizeReferenceMentions('mail me@example.com <Picture 2>', 2), 'mail me@example.com <Picture 2>');
  assert.equal(normalizeReferenceMentions('让@图片1挥手', 1), '让<Picture 1>挥手');
  for (const prompt of ['@Image 3', '@Image 0', '<Picture 6>']) assert.throws(() => normalizeReferenceMentions(prompt, 2));
});
test('deletion blocks referenced images and renumbers later references safely', () => {
  assert.equal(removeReferenceFromPrompt('@Image 1 waves', 0), null);
  assert.equal(removeReferenceFromPrompt('<Picture 2> waves', 1), null);
  assert.equal(removeReferenceFromPrompt('@Image 3 与 @图片2', 0), '@Image 2 与 @图片1');
});
test('picker recognizes unfinished mentions at the caret, not email addresses', () => {
  assert.deepEqual(mentionQuery('Hello @Im', 9), { start: 6, query: 'Im' });
  assert.deepEqual(mentionQuery('让@', 2), { start: 1, query: '' });
  assert.equal(mentionQuery('hello@example', 13), null);
  assert.equal(mentionQuery('@Image 1 waves', 14), null);
});
