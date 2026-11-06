const STYLE_ID = 'seedance-verification-styles';

export const VERIFICATION_ICONS = Object.freeze({
  shield: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 3v5c0 4.5-3.2 8-8 10-4.8-2-8-5.5-8-10V6l8-3Z"/><path d="m8.5 11.5 2.4 2.4 4.6-4.8"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
});

export function installVerificationStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sv-card,.sv-card *{box-sizing:border-box}
    .sv-card{position:relative;color:#edf3f4;background:linear-gradient(145deg,#192227,#12191e 68%);border:1px solid #314147;border-radius:24px;padding:28px;font:400 15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 28px 90px #0005;isolation:isolate}
    .sv-card::before{content:"";position:absolute;top:-1px;left:28px;right:28px;height:1px;background:linear-gradient(90deg,transparent,#78ded477,transparent);pointer-events:none}
    dialog.sv-card{width:400px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 32px);margin:auto;overflow:auto}
    dialog.sv-card::backdrop{background:#05090db8;backdrop-filter:blur(8px)}
    .sv-heading{display:flex;align-items:center;gap:13px;margin:0 30px 20px 0}
    .sv-mark{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:46px;color:#81e3d9;background:linear-gradient(150deg,#78ded41e,#78ded405);border-radius:13px}
    .sv-mark svg{width:27px;height:27px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .sv-eyebrow{color:#89a5ac;font-size:10px;line-height:1.4;font-weight:650;letter-spacing:.15em;margin:0 0 3px}
    .sv-card .sv-title{font:650 22px/1.3 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f1f6f7;letter-spacing:-.02em;margin:0}
    .sv-card .sv-description{color:#aabcc2;font-size:14px;line-height:1.7;margin:0 0 20px}
    .sv-close{position:absolute;right:17px;top:17px;display:grid;place-items:center;width:32px;height:32px;padding:6px;background:none;border:0;border-radius:8px;color:#81979f;cursor:pointer}
    .sv-close:hover{color:#eef6f6;background:#ffffff0a}
    .sv-close svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
    .sv-widget{display:flex;justify-content:center;align-items:center;min-height:68px;max-width:100%;margin:2px 0 18px}
    .sv-widget-loading{display:flex;align-items:center;gap:9px;color:#91a7ae;font-size:13px}
    .sv-spinner{width:14px;height:14px;border:1.5px solid #78ded42e;border-top-color:#78ded4;border-radius:50%;animation:sv-spin .8s linear infinite;flex:none}
    .sv-foot{display:flex;align-items:center;gap:7px;color:#7e969e;font-size:12px;line-height:1.6;margin:0}
    .sv-foot svg{width:15px;height:15px;flex:none;stroke:#6ca59f;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .sv-actions{display:flex;justify-content:flex-end;align-items:center;margin:20px 0 -7px;padding-top:14px;border-top:1px solid #ffffff0a}
    .sv-cancel{padding:7px 0 7px 14px;color:#a1b4ba;background:transparent;border:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;line-height:1.4}
    .sv-cancel:hover{color:#f2f8f8}
    .sv-card button:focus-visible,.sv-card a:focus-visible,.sv-page a:focus-visible{outline:2px solid #78ded4;outline-offset:4px}
    .sv-page{margin:0;min-height:100dvh;background:radial-gradient(ellipse at 50% 36%,#203d4138,transparent 58%),#0c1115;color:#edf3f4;font:400 14px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;grid-template-rows:auto 1fr auto}
    .sv-page-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:26px 36px}
    .sv-brand{display:flex;align-items:center;gap:10px;color:#edf3f4;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.02em}
    .sv-brand img{width:27px;height:27px;object-fit:contain}
    .sv-back{color:#91a7ae;text-decoration:none;font-size:12px;white-space:nowrap}
    .sv-back:hover{color:#81e3d9}
    .sv-page-main{display:grid;place-items:center;padding:32px 20px 72px}
    .sv-page-main>.sv-card{width:100%;max-width:424px;padding:30px}
    .sv-page-main>.sv-card .sv-heading{margin-bottom:24px}
    .sv-primary{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:13px 18px;min-height:48px;border:1px solid #ffffff0d;border-radius:12px;background:#315bd4;color:#fff;text-decoration:none;font:600 15px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px #244bb325;transition:background .16s,transform .16s}
    .sv-primary:hover{background:#3d69e8;transform:translateY(-1px)}
    .sv-primary:disabled{opacity:.65;cursor:wait;transform:none}
    .sv-primary svg{width:17px;height:17px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .sv-note{color:#81989f;font-size:12px;line-height:1.7;margin:17px 0 0;text-align:center}
    .sv-result{margin:0 0 22px}
    .sv-result-row{display:flex;align-items:center;gap:9px;color:#c4d8d8;font-size:13px;padding:7px 0}
    .sv-result-row svg{width:17px;height:17px;flex:none;stroke:#81e3d9;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .sv-trial-note{font-size:13px;line-height:1.7;color:#d6bf93;margin:0 0 22px;padding-top:14px;border-top:1px solid #ffffff0a}
    .sv-page-footer{text-align:center;color:#536d76;font-size:11px;padding:0 20px 22px;letter-spacing:.04em}
    .sv-card [hidden]{display:none!important}
    @keyframes sv-spin{to{transform:rotate(360deg)}}
    @media(max-width:480px){.sv-page-header{padding:20px}.sv-page-main{padding:20px 16px 54px}.sv-page-main>.sv-card{padding:25px 22px;border-radius:21px}dialog.sv-card{padding:24px 20px;border-radius:21px}}
    @media(prefers-reduced-motion:reduce){.sv-spinner{animation:none}.sv-primary{transition:none}}
  `;
  document.head.append(style);
}
