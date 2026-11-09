// One length heuristic for browser defaults and server-side automatic requests.
// This is a product threshold, not a judgment of prompt quality or authorship.
const WORD_LIMIT = 80;
const CJK_CHARACTER_LIMIT = 150;
const CJK_SCRIPT = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}]/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;

export function shouldOptimizeVideoPrompt(prompt, choice) {
  if (typeof choice === 'boolean') return choice;
  let characters = 0;
  // NFC counts decomposed Korean syllables and accented words consistently.
  const otherText = Array.from(String(prompt ?? '').normalize('NFC'), character => {
    if (CJK_SCRIPT.test(character) && LETTER_OR_NUMBER.test(character)) {
      characters += 1;
      return ' ';
    }
    return character;
  }).join('');
  const words = (otherText.match(WORD) ?? []).length;
  // words / 80 + CJK characters / 150 >= 1 disables automatic rewriting.
  // Use integers so exact mixed-language boundaries do not depend on rounding.
  return words * CJK_CHARACTER_LIMIT + characters * WORD_LIMIT < WORD_LIMIT * CJK_CHARACTER_LIMIT;
}
