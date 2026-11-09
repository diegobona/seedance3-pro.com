import { shouldOptimizeVideoPrompt } from './prompt-optimization-policy.mjs';

// Shared by the homepage and studio; the user's original textarea stays intact.
export function createPromptOptimizationControl(prompt, { zh = false } = {}) {
  const doc = prompt.ownerDocument;
  prompt.nextElementSibling?.matches('[data-prompt-optimization]') && prompt.nextElementSibling.remove();
  const root = doc.createElement('div');
  root.dataset.promptOptimization = '';
  root.hidden = true;
  root.style.cssText = 'margin:10px 0 16px;font:inherit;font-size:13px;color:#bbcbd6;';
  const label = doc.createElement('label');
  label.style.cssText = 'display:inline-flex;align-items:center;gap:8px;cursor:pointer;font:inherit;';
  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox'; checkbox.checked = true;
  checkbox.style.cssText = 'width:16px;height:16px;margin:0;padding:0;accent-color:#78dcd3;';
  label.append(checkbox, doc.createTextNode(zh ? '提示词优化' : 'Optimize prompt'));
  const hint = doc.createElement('small');
  hint.dataset.promptOptimizationHint = '';
  hint.textContent = zh ? '较长提示词默认保留原文，可手动开启优化。' : 'Longer prompts use your original text by default. You can turn optimization on.';
  hint.style.cssText = 'display:none;margin-top:6px;font-size:12px;line-height:1.5;color:#a4b6c4;';
  let manualChoice;
  function syncDefault() {
    checkbox.checked = shouldOptimizeVideoPrompt(prompt.value, manualChoice);
    hint.hidden = typeof manualChoice === 'boolean' || checkbox.checked;
    hint.style.display = hint.hidden ? 'none' : 'block';
  }
  const note = doc.createElement('small');
  note.setAttribute('role', 'status');
  note.style.cssText = 'display:none;margin-top:6px;font-size:12px;color:#a4b6c4;';
  note.hidden = true;
  const details = doc.createElement('details');
  details.hidden = true;
  details.style.cssText = 'margin-top:8px;font-size:12px;';
  const summary = doc.createElement('summary');
  summary.textContent = zh ? '✓ 已优化 · 查看本次提示词' : '✓ Optimized · View prompt used';
  summary.style.cssText = 'cursor:pointer;color:#78dcd3;padding:4px 0;';
  const panel = doc.createElement('div');
  panel.style.cssText = 'margin-top:8px;padding:12px;border:1px solid #293d4b;border-radius:10px;background:#101922;';
  const text = doc.createElement('pre');
  text.style.cssText = 'margin:0 0 10px;max-height:220px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.6;color:#dbe7ee;user-select:text;';
  const copy = doc.createElement('button');
  copy.type = 'button';
  const copyLabel = zh ? '复制' : 'Copy';
  copy.textContent = copyLabel;
  copy.setAttribute('aria-live', 'polite');
  copy.style.cssText = 'font:inherit;padding:5px 12px;border:1px solid #385266;border-radius:6px;background:#1a2b3a;color:#fff;cursor:pointer;';
  let revision = 0;
  let waiting = false;
  copy.addEventListener('click', async () => {
    const current = revision;
    const value = text.textContent;
    if (!value) return;
    try {
      await doc.defaultView.navigator.clipboard.writeText(value);
      if (revision === current) copy.textContent = zh ? '已复制' : 'Copied';
    } catch {
      if (revision === current) copy.textContent = zh ? '请选择文本复制' : 'Select text to copy';
    }
  });
  panel.append(text, copy); details.append(summary, panel);
  root.append(label, hint, note, details); prompt.after(root);
  function clearNote() {
    revision += 1;
    waiting = false;
    note.hidden = true; note.style.display = 'none'; note.textContent = '';
    details.hidden = true; details.open = false; text.textContent = ''; copy.textContent = copyLabel;
  }
  checkbox.addEventListener('change', () => { manualChoice = checkbox.checked; syncDefault(); clearNote(); });
  prompt.addEventListener('input', syncDefault);
  syncDefault();
  return {
    get enabled() { return shouldOptimizeVideoPrompt(prompt.value, manualChoice); },
    // Persist only an explicit choice. Undefined keeps automatic defaults after a handoff.
    get choice() { return manualChoice; },
    set choice(value) { manualChoice = typeof value === 'boolean' ? value : undefined; syncDefault(); },
    update({ guest, busy }) {
      syncDefault(); root.hidden = !guest; checkbox.disabled = busy;
      if (!busy && waiting) clearNote();
    },
    start({ pending = true } = {}) {
      clearNote();
      if (!pending || root.hidden || !shouldOptimizeVideoPrompt(prompt.value, manualChoice)) return;
      waiting = true;
      note.hidden = false; note.style.display = 'block';
      note.textContent = zh ? '正在准备生成，优化完成后可在此查看提示词。'
        : 'Preparing your video. The optimized prompt will appear here when ready.';
    },
    result(status, optimizedPrompt) {
      clearNote();
      if (status === 'optimized' && typeof optimizedPrompt === 'string' && optimizedPrompt.trim()) {
        text.textContent = optimizedPrompt;
        details.hidden = false;
        return;
      }
      note.hidden = status !== 'fallback';
      note.style.display = status === 'fallback' ? 'block' : 'none';
      note.textContent = status === 'fallback' ? (zh ? '提示词优化暂不可用，本次使用原提示词生成。' : 'Optimization unavailable. Using your original prompt.') : '';
    },
    destroy() { prompt.removeEventListener('input', syncDefault); root.remove(); },
  };
}
