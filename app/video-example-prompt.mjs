import { SEEDANCE_VIDEO_EXAMPLES } from './seedance-video-examples.mjs';

export function videoExamplePrompt(example, duration = 5, locale = 'en') {
  const trial = Number(duration) <= 5 && typeof example.trialPrompt === 'string';
  const english = trial ? example.trialPrompt : example.prompt;
  const chinese = trial ? example.trialPromptZh : example.promptZh;
  return locale === 'zh' && typeof chinese === 'string' ? chinese : english;
}

// Match complete, unedited catalog prompts only. Never rewrite a user's custom text.
// This also covers existing links and saved drafts containing the full 10s prompt.
export function adaptVideoExamplePrompt(prompt, duration, locale = 'en') {
  const example = SEEDANCE_VIDEO_EXAMPLES.find(item => item.trialPrompt &&
    [item.prompt, item.promptZh, item.trialPrompt, item.trialPromptZh].some(text => typeof text === 'string' && text === prompt));
  return example ? videoExamplePrompt(example, duration, locale) : prompt;
}
