import { validateVideoReferenceFiles } from './video-generation.mjs';

// Shared first/last-frame controls for the homepage and full workspace.
export function createVideoFrameInputs({ before, zh = false, onChange = () => {}, onError = () => {} }) {
  const text = (en, cn) => zh ? cn : en;
  if (!document.getElementById('guest-video-frame-style')) {
    const style = document.createElement('style');
    style.id = 'guest-video-frame-style';
    style.textContent = `.guest-video-frames[hidden]{display:none!important}.guest-video-frames{margin:18px 0}.guest-video-frame-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.guest-video-frame-slot{min-width:0;padding:14px;border:1px solid #294452;border-radius:18px;background:#101820}.guest-video-frame-slot strong{display:block;color:#eef6fc;font:600 14px/1.5 sans-serif;margin-bottom:10px}.guest-video-frame-slot button{cursor:pointer;color:#83dfd9;background:transparent;border:1px dashed #315460;border-radius:12px;width:100%;min-height:90px;padding:12px;font:500 14px/1.4 sans-serif}.guest-video-frame-slot button:focus-visible{outline:2px solid #77ded5;outline-offset:3px}.guest-video-frame-slot button:disabled{cursor:default;opacity:.55}.guest-video-frame-slot img{display:block;width:100%;height:125px;object-fit:contain;margin-bottom:8px}.guest-video-frame-slot [data-frame-remove]{min-height:32px;padding:5px;border:0;color:#b5c4ce}.guest-video-frames p{color:#9fb2bf;font:400 13px/1.5 sans-serif;margin:10px 0 0}`;
    document.head.append(style);
  }
  const root = document.createElement('section'); root.className = 'guest-video-frames'; root.hidden = true;
  const grid = document.createElement('div'); grid.className = 'guest-video-frame-grid'; root.append(grid);
  const hint = document.createElement('p'); hint.textContent = text('First frame required. Last frame optional. PNG, JPEG or WebP · max 10 MB each.', '首帧必选，尾帧可选。PNG、JPEG 或 WebP · 每张最大 10 MB。'); root.append(hint);
  before.before(root);
  let busy = false, active = 0;
  const files = [null, null], urls = [null, null];
  const controls = [0,1].map(index => {
    const slot = document.createElement('div'); slot.className = 'guest-video-frame-slot';
    const label = document.createElement('strong'); label.textContent = index ? text('Last frame · Optional', '尾帧 · 可选') : text('First frame · Required', '首帧 · 必选');
    const button = document.createElement('button'); button.type = 'button'; button.dataset.frameChoose = index ? 'last' : 'first';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.hidden = true; input.dataset.frameFile = index ? 'last' : 'first';
    input.setAttribute('aria-label', label.textContent);
    const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.frameRemove = index ? 'last' : 'first'; remove.textContent = text('Remove', '移除'); remove.hidden = true;
    button.onclick = () => { active = index; input.click(); };
    input.onchange = () => { if(input.files?.[0]) set(index,input.files[0]); input.value = ''; };
    remove.onclick = () => set(index,null);
    button.ondragover = event => { if(!busy) event.preventDefault(); };
    button.ondrop = event => { event.preventDefault(); if(!busy && event.dataTransfer?.files[0]) set(index,event.dataTransfer.files[0]); };
    slot.append(label,input,button,remove); grid.append(slot);
    return {button,input,remove};
  });
  function render() {
    controls.forEach(({button,input,remove},index) => {
      button.replaceChildren();
      if(files[index]) { const image = document.createElement('img'); image.src = urls[index]; image.alt = index ? text('Last frame preview','尾帧预览') : text('First frame preview','首帧预览'); button.append(image); }
      button.append(document.createTextNode(files[index] ? text('Change image','更换图片') : text('＋ Upload image','＋ 上传图片')));
      button.disabled = input.disabled = remove.disabled = busy; remove.hidden = !files[index];
    });
  }
  function set(index,file) {
    if(busy)return false;
    try { if(file) validateVideoReferenceFiles([file]); } catch(error) { onError(error.message); return false; }
    if(urls[index]) URL.revokeObjectURL(urls[index]);
    files[index] = file; urls[index] = file ? URL.createObjectURL(file) : null;
    render(); onChange(); return true;
  }
  render();
  return {
    root,
    get valid() { return Boolean(files[0]); },
    get files() { return files[0] ? files.filter(Boolean) : []; },
    update({visible,disabled=false}) { root.hidden = !visible; busy = disabled; controls.forEach(({button,input,remove}) => { button.disabled = input.disabled = remove.disabled = busy; }); },
    setFiles(incoming) { set(0,incoming[0] || null); set(1,incoming[1] || null); },
    paste(incoming) { if(!incoming.length || busy)return false; return set(!files[0] ? 0 : !files[1] ? 1 : active,incoming[0]); },
    destroy() { urls.forEach(url => { if(url)URL.revokeObjectURL(url); }); root.remove(); },
  };
}
